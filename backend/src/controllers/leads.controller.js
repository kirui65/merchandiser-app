const { getFirestore, admin } = require('../config/firebase');
const { createDoc, getDoc, listDocs, updateDoc } = require('../services/firestore.service');
const { scopeCheck, teamScopeCheck } = require('../middleware/auth.middleware');
const { listTeamDocs } = require('../services/teamScope.service');
const { ApiError } = require('../middleware/errorHandler');
const { LeadStatusSchema } = require('../models/lead.model');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');

const leadStatuses = LeadStatusSchema.options;

function timestampValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  return 0;
}

async function createLead(req, res, next) {
  try {
    const lead = await createDoc('leads', {
      ...req.body,
      telemarketerId: req.user.uid,
      teamId: await getActiveTeamIdForUser(req.user.uid),
      callCount: 0,
      lastCalledAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ lead });
  } catch (err) {
    return next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    if (req.query.status && !LeadStatusSchema.safeParse(req.query.status).success) {
      throw new ApiError(400, 'Invalid lead status filter');
    }

    let leads;
    if (req.user.role === 'manager') {
      leads = await listDocs('leads', { orderBy: { field: 'updatedAt', direction: 'desc' } });
      if (req.query.telemarketerId) {
        leads = leads.filter((lead) => lead.telemarketerId === req.query.telemarketerId);
      }
      if (req.query.status) leads = leads.filter((lead) => lead.status === req.query.status);
    } else if (req.user.role === 'team_leader') {
      leads = await listTeamDocs('leads', req.user.teamIds || []);
      if (req.query.status) leads = leads.filter((lead) => lead.status === req.query.status);
      if (req.query.telemarketerId) leads = leads.filter((lead) => lead.telemarketerId === req.query.telemarketerId);
    } else if (req.query.status) {
      leads = await listDocs('leads', {
        where: [['telemarketerId', '==', req.user.uid], ['status', '==', req.query.status]],
        orderBy: { field: 'updatedAt', direction: 'desc' },
      });
    } else {
      const byStatus = await Promise.all(leadStatuses.map((status) => listDocs('leads', {
        where: [['telemarketerId', '==', req.user.uid], ['status', '==', status]],
        orderBy: { field: 'updatedAt', direction: 'desc' },
      })));
      leads = byStatus.flat().sort((a, b) => timestampValue(b.updatedAt) - timestampValue(a.updatedAt));
    }

    const filtered = req.query.score
      ? leads.filter((lead) => lead.score === req.query.score)
      : leads;
    return res.json({ leads: filtered });
  } catch (err) {
    return next(err);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await getDoc('leads', req.params.id);
    if (!lead) throw new ApiError(404, 'Lead not found');
    const allowed = req.user.role === 'team_leader'
      ? teamScopeCheck(req.user, lead.teamId)
      : scopeCheck(req.user, lead.telemarketerId);
    if (!allowed) {
      throw new ApiError(403, 'Not authorized to view this lead');
    }
    return res.json({ lead });
  } catch (err) {
    return next(err);
  }
}

async function updateLead(req, res, next) {
  try {
    const existing = await getDoc('leads', req.params.id);
    if (!existing) throw new ApiError(404, 'Lead not found');
    if (!scopeCheck(req.user, existing.telemarketerId)) throw new ApiError(403, 'Not authorized to update this lead');

    const lead = await updateDoc('leads', req.params.id, {
      ...req.body,
      teamId: await getActiveTeamIdForUser(req.user.uid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ lead });
  } catch (err) {
    return next(err);
  }
}

async function listCalls(req, res, next) {
  try {
    const where = [];
    if (req.query.leadId) {
      const lead = await getDoc('leads', req.query.leadId);
      if (!lead) throw new ApiError(404, 'Lead not found');
      const allowed = req.user.role === 'team_leader'
        ? teamScopeCheck(req.user, lead.teamId)
        : scopeCheck(req.user, lead.telemarketerId);
      if (!allowed) {
        throw new ApiError(403, 'Not authorized to view this lead');
      }
      where.push(['leadId', '==', req.query.leadId]);
    } else if (req.user.role !== 'manager') {
      if (req.user.role === 'team_leader') where.push(['teamId', 'in', req.user.teamIds || []]);
      else where.push(['telemarketerId', '==', req.user.uid]);
    } else if (req.query.telemarketerId) {
      where.push(['telemarketerId', '==', req.query.telemarketerId]);
    }

    let calls = req.user.role === 'team_leader' && !req.query.leadId
      ? await listTeamDocs('calls', req.user.teamIds || [])
      : await listDocs('calls', { where, orderBy: { field: 'startedAt', direction: 'desc' } });
    if (req.user.role === 'team_leader') {
      calls = calls.filter((call) => teamScopeCheck(req.user, call.teamId));
    }
    return res.json({ calls });
  } catch (err) {
    return next(err);
  }
}

async function createCall(req, res, next) {
  try {
    const db = getFirestore();
    const leadRef = db.collection('leads').doc(req.params.leadId);
    const callRef = req.callRequestId
      ? db.collection('calls').doc(req.callRequestId)
      : db.collection('calls').doc();
    const callData = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const [leadSnapshot, existingCallSnapshot] = await Promise.all([
        transaction.get(leadRef),
        transaction.get(callRef),
      ]);
      if (!leadSnapshot.exists) throw new ApiError(404, 'Lead not found');

      const lead = { id: leadSnapshot.id, ...leadSnapshot.data() };
      if (!scopeCheck(req.user, lead.telemarketerId)) {
        throw new ApiError(403, 'Not authorized to log a call for this lead');
      }
      if (req.user.role !== 'telemarketer') throw new ApiError(403, 'Telemarketer role required');
      if (existingCallSnapshot.exists) {
        const existingCall = existingCallSnapshot.data();
        if (existingCall.leadId !== lead.id || existingCall.telemarketerId !== req.user.uid) {
          throw new ApiError(409, 'Idempotency key has already been used');
        }
        return { duplicate: true };
      }

      const calledAt = callData.endedAt ?? callData.startedAt;
      const call = {
        ...callData,
        leadId: lead.id,
        telemarketerId: lead.telemarketerId,
        teamId: await getActiveTeamIdForUser(req.user.uid),
        ...(lead.campaignId ? { campaignId: lead.campaignId } : {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const leadUpdate = {
        callCount: Number(lead.callCount || 0) + 1,
        lastCalledAt: calledAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (callData.statusAfterCall) leadUpdate.status = callData.statusAfterCall;
      if (callData.scoreAfterCall) leadUpdate.score = callData.scoreAfterCall;
      if (Object.prototype.hasOwnProperty.call(callData, 'followUpAt')) {
        leadUpdate.nextFollowUpAt = callData.followUpAt;
      }

      transaction.create(callRef, call);
      transaction.update(leadRef, leadUpdate);
      return { duplicate: false };
    });

    const callSnapshot = await callRef.get();
    return res.status(result.duplicate ? 200 : 201).json({
      call: { id: callSnapshot.id, ...callSnapshot.data() },
      duplicate: result.duplicate,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createLead, listLeads, getLead, updateLead, listCalls, createCall };
