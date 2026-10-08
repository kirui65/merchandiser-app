const { getFirestore, admin } = require('../config/firebase');
const { getDoc, listDocs } = require('../services/firestore.service');
const { listTeamDocs } = require('../services/teamScope.service');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { teamScopeCheck } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler');
const { isActiveSale } = require('../models/sale.model');

const ACTIVE_LOCATION_WINDOW_MS = 8 * 60 * 1000;

function timeMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function getOverview(req, res, next) {
  try {
    const teamIds = req.user.teamIds || [];
    const [teams, membershipPages, sales, activations, leads, audits, calls] = await Promise.all([
      Promise.all(teamIds.map((id) => getDoc('teams', id))),
      Promise.all(teamIds.map((teamId) => listDocs('teamMemberships', {
        where: [['teamId', '==', teamId], ['status', '==', 'active']],
      }))),
      listTeamDocs('sales', teamIds),
      listTeamDocs('activations', teamIds),
      listTeamDocs('leads', teamIds),
      listTeamDocs('merchandisingAudits', teamIds),
      listTeamDocs('calls', teamIds),
    ]);
    const activeSales = sales.filter(isActiveSale);
    const memberships = membershipPages.flat();
    const repIds = [...new Set(memberships.map((item) => item.repId))];
    const reps = await Promise.all(repIds.map((id) => getDoc('reps', id)));
    const repById = new Map(reps.filter(Boolean).map((rep) => [rep.id, rep]));
    const teamIdsByRep = new Map(repIds.map((repId) => [repId, []]));
    memberships.forEach((membership) => {
      if (teamIdsByRep.has(membership.repId)) teamIdsByRep.get(membership.repId).push(membership.teamId);
    });
    const month = new Date().toISOString().slice(0, 7);
    const targetDocs = await Promise.all(repIds.map((repId) => getDoc('salesTargets', `${repId}_${month}`)));
    const targetByRep = new Map(repIds.map((repId, index) => [repId, Number(targetDocs[index]?.amount || 0)]));
    const monthStart = Date.parse(`${month}-01T00:00:00.000Z`);
    const monthEndDate = new Date(`${month}-01T00:00:00.000Z`);
    monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
    const monthEnd = monthEndDate.getTime();
    const monthlySales = activeSales.filter((sale) => {
      const timestamp = timeMillis(sale.timestamp);
      return timestamp >= monthStart && timestamp < monthEnd;
    });
    const activityByRep = new Map(repIds.map((id) => [id, 0]));
    for (const record of [...activeSales, ...activations, ...calls, ...audits]) {
      const ownerId = record.repId || record.ambassadorId || record.telemarketerId || record.merchandiserId;
      if (activityByRep.has(ownerId)) activityByRep.set(ownerId, activityByRep.get(ownerId) + 1);
    }
    const leaderboard = repIds.map((repId) => ({
      repId,
      name: repById.get(repId)?.name || repId,
      role: repById.get(repId)?.role || 'unknown',
      activityCount: activityByRep.get(repId) || 0,
    })).sort((a, b) => b.activityCount - a.activityCount || a.name.localeCompare(b.name))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const members = repIds.map((repId) => ({
    repId,
    name: repById.get(repId)?.name || repId,
    role: repById.get(repId)?.role || 'unknown',
    teamIds: teamIdsByRep.get(repId) || [],
    })).sort((a, b) => a.name.localeCompare(b.name));

    const now = Date.now();
    return res.json({
      teams: teams.filter(Boolean),
      memberCount: repIds.length,
      members,
      sales: {
        count: activeSales.length,
        total: Number(activeSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0).toFixed(2)),
      },
      salesTarget: {
        month,
        target: Number([...targetByRep.values()].reduce((sum, value) => sum + value, 0).toFixed(2)),
        actual: Number(monthlySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0).toFixed(2)),
        targetedMemberCount: [...targetByRep.values()].filter((value) => value > 0).length,
      },
      activations: {
        count: activations.length,
        submittedCount: activations.filter((item) => item.status === 'submitted').length,
        totalFootfall: activations.reduce((sum, item) => sum + Number(item.footfallCount || 0), 0),
      },
      leads: {
        count: leads.length,
        openCount: leads.filter((item) => !['converted', 'not_interested', 'closed'].includes(item.status)).length,
        calls: calls.length,
      },
      merchandisingAudits: {
        count: audits.length,
        lowStockCount: audits.reduce((sum, audit) => sum + (audit.stockChecks || []).filter((check) => check.lowStock).length, 0),
      },
      leaderboard,
      generatedAt: new Date(now).toISOString(),
    });
  } catch (err) {
    return next(err);
  }
}

async function getTeamLocations(req, res, next) {
  try {
    const teamIds = req.user.teamIds || [];
    const memberships = await listTeamDocs('teamMemberships', teamIds);
    const activeMemberships = memberships.filter((item) => item.status === 'active');
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const locations = await Promise.all(activeMemberships.map(async (membership) => {
      const [rep, route] = await Promise.all([
        getDoc('reps', membership.repId),
        getDoc('routes', `${membership.repId}_${today}`),
      ]);
      const pings = Array.isArray(route?.pings) ? route.pings : [];
      const latest = pings.reduce((current, ping) =>
        !current || timeMillis(ping.timestamp) > timeMillis(current.timestamp) ? ping : current, null);
      if (!rep || rep.active === false || rep.role === 'telemarketer' || !latest
        || now - timeMillis(latest.timestamp) > ACTIVE_LOCATION_WINDOW_MS
        || !Number.isFinite(Number(latest.lat)) || !Number.isFinite(Number(latest.lng))
        || Math.abs(Number(latest.lat)) > 90 || Math.abs(Number(latest.lng)) > 180) {
        return null;
      }
      return {
        repId: rep.id,
        name: rep.name,
        role: rep.role,
        teamId: membership.teamId,
        latitude: Number(latest.lat),
        longitude: Number(latest.lng),
        timestamp: latest.timestamp,
      };
    }));
    return res.json({ locations: locations.filter(Boolean), freshnessWindowSeconds: ACTIVE_LOCATION_WINDOW_MS / 1000 });
  } catch (err) {
    return next(err);
  }
}

async function listBroadcasts(req, res, next) {
  try {
    const teamIds = req.user.role === 'manager'
      ? null
      : req.user.role === 'team_leader'
        ? (req.user.teamIds || [])
        : [await getActiveTeamIdForUser(req.user.uid)].filter(Boolean);
    let broadcasts;
    if (teamIds === null) broadcasts = await listDocs('broadcasts');
    else broadcasts = await listTeamDocs('broadcasts', teamIds);
    if (req.user.role !== 'manager' && req.user.role !== 'team_leader') {
      broadcasts = broadcasts.filter((item) => item.status === 'published');
    }
    if (req.query.teamId) {
      if (!teamScopeCheck(req.user, req.query.teamId) && !teamIds?.includes(req.query.teamId)) {
        throw new ApiError(403, 'Not authorized to view this team’s broadcasts');
      }
      broadcasts = broadcasts.filter((item) => item.teamId === req.query.teamId);
    }
    const now = Date.now();
    broadcasts = broadcasts.filter((item) => !item.expiresAt || timeMillis(item.expiresAt) >= now)
      .sort((a, b) => timeMillis(b.publishedAt || b.createdAt) - timeMillis(a.publishedAt || a.createdAt));
    return res.json({ broadcasts });
  } catch (err) {
    return next(err);
  }
}

async function createBroadcast(req, res, next) {
  try {
    const teamId = req.body.teamId;
    if (req.user.role !== 'team_leader' || !teamScopeCheck(req.user, teamId)) {
      throw new ApiError(403, 'Broadcasts can only be created for your own team');
    }
    const ref = getFirestore().collection('broadcasts').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.create({
      id: ref.id,
      teamId,
      senderId: req.user.uid,
      title: req.body.title,
      message: req.body.message,
      status: 'draft',
      expiresAt: req.body.expiresAt ? admin.firestore.Timestamp.fromDate(new Date(req.body.expiresAt)) : null,
      createdAt: now,
      updatedAt: now,
    });
    const snapshot = await ref.get();
    return res.status(201).json({ broadcast: { id: snapshot.id, ...snapshot.data() } });
  } catch (err) {
    return next(err);
  }
}

async function updateBroadcast(req, res, next) {
  try {
    const ref = getFirestore().collection('broadcasts').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Broadcast not found');
    const current = snapshot.data();
    if (req.user.role !== 'manager'
      && (req.user.role !== 'team_leader' || current.senderId !== req.user.uid || !teamScopeCheck(req.user, current.teamId))) {
      throw new ApiError(403, 'Not authorized to update this broadcast');
    }
    const update = {
      ...req.body,
      ...(Object.prototype.hasOwnProperty.call(req.body, 'expiresAt')
        ? { expiresAt: req.body.expiresAt ? admin.firestore.Timestamp.fromDate(new Date(req.body.expiresAt)) : null }
        : {}),
      ...(req.body.status === 'published' && current.status !== 'published'
        ? { publishedAt: admin.firestore.FieldValue.serverTimestamp() }
        : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    delete update.teamId;
    await ref.update(update);
    const updated = await ref.get();
    return res.json({ broadcast: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

async function deleteBroadcast(req, res, next) {
  try {
    const ref = getFirestore().collection('broadcasts').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Broadcast not found');
    const current = snapshot.data();
    if (req.user.role !== 'manager'
      && (req.user.role !== 'team_leader' || current.senderId !== req.user.uid || !teamScopeCheck(req.user, current.teamId))) {
      throw new ApiError(403, 'Not authorized to archive this broadcast');
    }
    await ref.update({
      status: 'archived',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function listFieldRequests(req, res, next) {
  try {
    let requests;
    if (req.user.role === 'manager') requests = await listDocs('fieldRequests');
    else if (req.user.role === 'team_leader') requests = await listTeamDocs('fieldRequests', req.user.teamIds || []);
    else requests = await listDocs('fieldRequests', { where: [['requesterId', '==', req.user.uid]] });
    if (req.query.mine === 'true') requests = requests.filter((item) => item.requesterId === req.user.uid);
    if (req.query.status) requests = requests.filter((item) => item.status === req.query.status);
    const requesterIds = [...new Set(requests.map((item) => item.requesterId))];
    const requesters = await Promise.all(requesterIds.map((id) => getDoc('reps', id)));
    const requesterNames = new Map(requesters.filter(Boolean).map((rep) => [rep.id, rep.name]));
    return res.json({
      requests: requests
        .sort((a, b) => timeMillis(b.createdAt) - timeMillis(a.createdAt))
        .map((item) => ({ ...item, requesterName: requesterNames.get(item.requesterId) || item.requesterId })),
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteFieldRequest(req, res, next) {
  try {
    const ref = getFirestore().collection('fieldRequests').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Field request not found');
    const request = snapshot.data();
    if (req.user.role !== 'manager' && request.requesterId !== req.user.uid) {
      throw new ApiError(403, 'Only the requester may withdraw this field request');
    }
    if (request.status !== 'pending') throw new ApiError(409, 'Only pending requests may be withdrawn');
    await ref.delete();
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function createFieldRequest(req, res, next) {
  try {
    const leaderTeams = req.user.role === 'team_leader' ? req.user.teamIds || [] : null;
    if (leaderTeams && leaderTeams.length > 1) {
      throw new ApiError(409, 'Choose a single team before submitting a team leader field request');
    }
    const teamId = leaderTeams
      ? leaderTeams[0]
      : await getActiveTeamIdForUser(req.user.uid);
    if (!teamId) throw new ApiError(409, 'Join an active team before submitting a field request');
    const ref = getFirestore().collection('fieldRequests').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.create({
      id: ref.id,
      requesterId: req.user.uid,
      teamId,
      requestType: req.body.requestType,
      startsAt: admin.firestore.Timestamp.fromDate(new Date(req.body.startsAt)),
      ...(req.body.endsAt ? { endsAt: admin.firestore.Timestamp.fromDate(new Date(req.body.endsAt)) } : {}),
      ...(req.body.reason ? { reason: req.body.reason } : {}),
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const snapshot = await ref.get();
    return res.status(201).json({ request: { id: snapshot.id, ...snapshot.data() } });
  } catch (err) {
    return next(err);
  }
}

async function reviewFieldRequest(req, res, next) {
  try {
    const ref = getFirestore().collection('fieldRequests').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Field request not found');
    const current = snapshot.data();
    if (!teamScopeCheck(req.user, current.teamId)) {
      throw new ApiError(403, 'Not authorized to review requests for this team');
    }
    if (current.status !== 'pending') throw new ApiError(409, 'Only pending requests can be reviewed');
    await ref.update({
      status: req.body.status,
      reviewedBy: req.user.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    return res.json({ request: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOverview,
  getTeamLocations,
  listBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  listFieldRequests,
  deleteFieldRequest,
  createFieldRequest,
  reviewFieldRequest,
};
