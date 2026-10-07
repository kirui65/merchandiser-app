const { getFirestore, getStorageBucket, admin } = require('../config/firebase');
const { listDocs } = require('../services/firestore.service');
const { scopeCheck } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler');
const { ActivationStatusSchema } = require('../models/activation.model');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { teamScopeCheck } = require('../middleware/auth.middleware');
const { listTeamDocs } = require('../services/teamScope.service');

function toDate(value, field) {
  const date = value && typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${field}`);
  return admin.firestore.Timestamp.fromDate(date);
}

function toStoredActivation(input, ambassadorId, teamId) {
  const location = new admin.firestore.GeoPoint(input.location.latitude, input.location.longitude);
  const activationFields = { ...input };
  delete activationFields.id;
  return {
    ...activationFields,
    ambassadorId,
    teamId,
    campaignId: input.campaignId ?? null,
    location,
    startedAt: toDate(input.startedAt, 'startedAt'),
    ...(input.endedAt ? { endedAt: toDate(input.endedAt, 'endedAt') } : { endedAt: null }),
    media: (input.media || []).map((item) => {
      const { mediaId, ...storedMedia } = item;
      return { ...storedMedia, capturedAt: toDate(item.capturedAt, 'media capturedAt') };
    }),
    surveyResponses: (input.surveyResponses || []).map((item) => ({ ...item, capturedAt: toDate(item.capturedAt, 'survey capturedAt') })),
    expenses: (input.expenses || []).map((item) => ({ ...item, incurredAt: toDate(item.incurredAt, 'expense incurredAt') })),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function assertStorageUrisBelongToUser(input, userId) {
  const prefix = `gs://${getStorageBucket().name}/activations/${userId}/`;
  const uris = [
    ...(input.media || []).map((item) => item.storageUri),
    ...(input.expenses || []).map((item) => item.receiptStorageUri).filter(Boolean),
  ];
  if (uris.some((uri) => !uri.startsWith(prefix))) {
    throw new ApiError(400, 'Activation media must use this ambassador’s activation storage path');
  }
}

async function createActivation(req, res, next) {
  try {
    const db = getFirestore();
    const id = req.activationRequestId;
    const activationRef = id ? db.collection('activations').doc(id) : db.collection('activations').doc();
    assertStorageUrisBelongToUser(req.body, req.user.uid);
    const stored = toStoredActivation(req.body, req.user.uid, await getActiveTeamIdForUser(req.user.uid));

    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(activationRef);
      if (existing.exists) {
        if (existing.data().ambassadorId !== req.user.uid) {
          throw new ApiError(409, 'Idempotency key has already been used');
        }
        return { duplicate: true };
      }
      transaction.create(activationRef, {
        ...stored,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { duplicate: false };
    });

    const snapshot = await activationRef.get();
    return res.status(result.duplicate ? 200 : 201).json({
      activation: { id: snapshot.id, ...snapshot.data() },
      duplicate: result.duplicate,
    });
  } catch (err) {
    return next(err);
  }
}

async function listActivations(req, res, next) {
  try {
    if (req.query.status && !ActivationStatusSchema.safeParse(req.query.status).success) {
      throw new ApiError(400, 'Invalid activation status filter');
    }
    let activations;
    if (req.user.role === 'manager') {
      activations = await listDocs('activations', { orderBy: { field: 'startedAt', direction: 'desc' } });
    } else if (req.user.role === 'team_leader') {
      activations = await listTeamDocs('activations', req.user.teamIds || []);
    } else {
      activations = await listDocs('activations', {
        where: [['ambassadorId', '==', req.user.uid]],
        orderBy: { field: 'startedAt', direction: 'desc' },
      });
    }
    if (req.query.ambassadorId && req.user.role === 'manager') {
      activations = activations.filter((item) => item.ambassadorId === req.query.ambassadorId);
    }
    if (req.user.role === 'team_leader' && req.query.ambassadorId) {
      activations = activations.filter((item) => item.ambassadorId === req.query.ambassadorId);
    }
    if (req.query.status) activations = activations.filter((item) => item.status === req.query.status);
    if (req.query.from) {
      const from = Date.parse(req.query.from);
      if (!Number.isFinite(from)) throw new ApiError(400, 'Invalid from date filter');
      activations = activations.filter((item) => timestampMillis(item.startedAt) >= from);
    }
    if (req.query.to) {
      const to = Date.parse(req.query.to);
      if (!Number.isFinite(to)) throw new ApiError(400, 'Invalid to date filter');
      activations = activations.filter((item) => timestampMillis(item.startedAt) <= to);
    }
    return res.json({ activations });
  } catch (err) {
    return next(err);
  }
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  if (typeof value === 'number') return value;
  return Date.parse(value) || 0;
}

async function updateActivation(req, res, next) {
  try {
    if (req.user.role === 'team_leader') {
      throw new ApiError(403, 'Team leaders have read-only access to activation records');
    }
    const db = getFirestore();
    const ref = db.collection('activations').doc(req.params.id);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new ApiError(404, 'Activation not found');
      const current = { id: snapshot.id, ...snapshot.data() };

      if (req.user.role === 'manager') {
        if (!['approved', 'rejected'].includes(req.body.status)) {
          throw new ApiError(400, 'Managers may only approve or reject activations');
        }
        if (current.status !== 'submitted') {
          throw new ApiError(409, 'Only submitted activations can be reviewed');
        }
        transaction.update(ref, {
          status: req.body.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      if (!scopeCheck(req.user, current.ambassadorId)) {
        throw new ApiError(403, 'Not authorized to update this activation');
      }
      if (current.status !== 'draft') {
        throw new ApiError(409, 'Only draft activations can be edited or submitted');
      }
      if (req.body.status && req.body.status !== 'submitted' && req.body.status !== 'draft') {
        throw new ApiError(403, 'Ambassadors may only submit draft activations');
      }
      assertStorageUrisBelongToUser(req.body, req.user.uid);
      const { status = current.status, ...fields } = req.body;
      const teamId = await getActiveTeamIdForUser(req.user.uid);
      const normalized = toStoredActivation({
        ...current,
        ...fields,
        teamId,
        status,
        location: fields.location || current.location,
        startedAt: fields.startedAt || current.startedAt,
        media: fields.media || current.media || [],
        surveyResponses: fields.surveyResponses || current.surveyResponses || [],
        expenses: fields.expenses || current.expenses || [],
        samplesDistributed: fields.samplesDistributed || current.samplesDistributed || [],
      }, current.ambassadorId);
      transaction.update(ref, { ...normalized, status });
      return;
    });
    const updated = await ref.get();
    return res.json({ activation: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createActivation, listActivations, updateActivation };
