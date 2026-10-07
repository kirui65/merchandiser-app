const { getFirestore, getStorageBucket, admin } = require('../config/firebase');
const { listDocs } = require('../services/firestore.service');
const { scopeCheck } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { listTeamDocs } = require('../services/teamScope.service');

function asTimestamp(value, field) {
  const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${field}`);
  return admin.firestore.Timestamp.fromDate(date);
}

function assertStorageUrisBelongToUser(uris, uid) {
  const prefix = `gs://${getStorageBucket().name}/merchandising/${uid}/`;
  if (uris.some((uri) => !uri.startsWith(prefix))) {
    throw new ApiError(400, 'Photo must use this merchandiser’s storage path');
  }
}

function requireRepOrManager(req, res, next) {
  if (!['rep', 'manager', 'team_leader'].includes(req.user.role)) {
    return next(new ApiError(403, 'Merchandiser, team leader, or manager role required'));
  }
  return next();
}

async function assertOutletScope(outletId, user) {
  const snapshot = await getFirestore().collection('outlets').doc(outletId).get();
  if (!snapshot.exists) throw new ApiError(404, 'Outlet not found');
  const outlet = { id: snapshot.id, ...snapshot.data() };
  if (!scopeCheck(user, outlet.assignedRepId)) throw new ApiError(403, 'Not authorized to record data for this outlet');
  return outlet;
}

async function createMerchandisingAudit(req, res, next) {
  try {
    await assertOutletScope(req.body.outletId, req.user);
    assertStorageUrisBelongToUser(req.body.photoStorageUris, req.user.uid);
    const db = getFirestore();
    const collection = db.collection('merchandisingAudits');
    const ref = req.recordId ? collection.doc(req.recordId) : collection.doc();
    const data = {
      ...req.body,
      merchandiserId: req.user.uid,
      teamId: await getActiveTeamIdForUser(req.user.uid),
      observedAt: asTimestamp(req.body.observedAt, 'observedAt'),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        if (existing.data().merchandiserId !== req.user.uid) throw new ApiError(409, 'Idempotency key already used');
        return true;
      }
      transaction.create(ref, data);
      return false;
    });
    const snapshot = await ref.get();
    return res.status(result ? 200 : 201).json({ audit: { id: snapshot.id, ...snapshot.data() }, duplicate: result });
  } catch (err) {
    return next(err);
  }
}

async function listMerchandisingAudits(req, res, next) {
  try {
    let audits = req.user.role === 'manager'
      ? await listDocs('merchandisingAudits', { orderBy: { field: 'observedAt', direction: 'desc' } })
      : req.user.role === 'team_leader'
        ? await listTeamDocs('merchandisingAudits', req.user.teamIds || [])
        : await listDocs('merchandisingAudits', {
          where: [['merchandiserId', '==', req.user.uid]],
          orderBy: { field: 'observedAt', direction: 'desc' },
        });
    if (req.user.role === 'manager' && req.query.merchandiserId) {
      audits = audits.filter((audit) => audit.merchandiserId === req.query.merchandiserId);
    }
    if (req.user.role === 'team_leader' && req.query.merchandiserId) {
      audits = audits.filter((audit) => audit.merchandiserId === req.query.merchandiserId);
    }
    if (req.query.outletId) audits = audits.filter((audit) => audit.outletId === req.query.outletId);
    if (req.query.lowStock === 'true') {
      audits = audits.filter((audit) => audit.stockChecks.some((check) => check.lowStock));
    }
    return res.json({ audits });
  } catch (err) {
    return next(err);
  }
}

async function updateMerchandisingAudit(req, res, next) {
  try {
    const ref = getFirestore().collection('merchandisingAudits').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Merchandising audit not found');
    const existing = snapshot.data();
    if (!scopeCheck(req.user, existing.merchandiserId)) {
      throw new ApiError(403, 'Not authorized to update this merchandising audit');
    }
    if (req.body.outletId && req.body.outletId !== existing.outletId) {
      await assertOutletScope(req.body.outletId, req.user);
    }
    if (req.body.photoStorageUris) {
      assertStorageUrisBelongToUser(req.body.photoStorageUris, existing.merchandiserId);
    }
    const updates = {
      ...req.body,
      teamId: await getActiveTeamIdForUser(
        req.user.role === 'manager' ? existing.merchandiserId : req.user.uid,
      ),
      ...(req.body.observedAt ? { observedAt: asTimestamp(req.body.observedAt, 'observedAt') } : {}),
    };
    await ref.update(updates);
    const updated = await ref.get();
    return res.json({ audit: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

async function deleteMerchandisingAudit(req, res, next) {
  try {
    const ref = getFirestore().collection('merchandisingAudits').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Merchandising audit not found');
    if (!scopeCheck(req.user, snapshot.data().merchandiserId)) {
      throw new ApiError(403, 'Not authorized to delete this merchandising audit');
    }
    await ref.delete();
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function createCompetitorPrice(req, res, next) {
  try {
    await assertOutletScope(req.body.outletId, req.user);
    if (req.body.photoStorageUri) assertStorageUrisBelongToUser([req.body.photoStorageUri], req.user.uid);
    const db = getFirestore();
    const collection = db.collection('competitorPrices');
    const ref = req.recordId ? collection.doc(req.recordId) : collection.doc();
    const data = {
      ...req.body,
      merchandiserId: req.user.uid,
      teamId: await getActiveTeamIdForUser(req.user.uid),
      observedAt: asTimestamp(req.body.observedAt, 'observedAt'),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const duplicate = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        if (existing.data().merchandiserId !== req.user.uid) throw new ApiError(409, 'Idempotency key already used');
        return true;
      }
      transaction.create(ref, data);
      return false;
    });
    const snapshot = await ref.get();
    return res.status(duplicate ? 200 : 201).json({ observation: { id: snapshot.id, ...snapshot.data() }, duplicate });
  } catch (err) {
    return next(err);
  }
}

async function updateCompetitorPrice(req, res, next) {
  try {
    const ref = getFirestore().collection('competitorPrices').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Competitor price observation not found');
    const existing = snapshot.data();
    if (!scopeCheck(req.user, existing.merchandiserId)) {
      throw new ApiError(403, 'Not authorized to update this competitor price');
    }
    if (req.body.outletId && req.body.outletId !== existing.outletId) {
      await assertOutletScope(req.body.outletId, req.user);
    }
    if (req.body.photoStorageUri) {
      assertStorageUrisBelongToUser([req.body.photoStorageUri], existing.merchandiserId);
    }
    const updates = {
      ...req.body,
      teamId: await getActiveTeamIdForUser(
        req.user.role === 'manager' ? existing.merchandiserId : req.user.uid,
      ),
      ...(req.body.observedAt ? { observedAt: asTimestamp(req.body.observedAt, 'observedAt') } : {}),
    };
    await ref.update(updates);
    const updated = await ref.get();
    return res.json({ observation: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

async function deleteCompetitorPrice(req, res, next) {
  try {
    const ref = getFirestore().collection('competitorPrices').doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new ApiError(404, 'Competitor price observation not found');
    if (!scopeCheck(req.user, snapshot.data().merchandiserId)) {
      throw new ApiError(403, 'Not authorized to delete this competitor price');
    }
    await ref.delete();
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function listCompetitorPrices(req, res, next) {
  try {
    let observations = req.user.role === 'manager'
      ? await listDocs('competitorPrices', { orderBy: { field: 'observedAt', direction: 'desc' } })
      : req.user.role === 'team_leader'
        ? await listTeamDocs('competitorPrices', req.user.teamIds || [])
        : await listDocs('competitorPrices', {
          where: [['merchandiserId', '==', req.user.uid]],
          orderBy: { field: 'observedAt', direction: 'desc' },
        });
    if (req.query.outletId) observations = observations.filter((item) => item.outletId === req.query.outletId);
    if (req.query.ourProductId) observations = observations.filter((item) => item.ourProductId === req.query.ourProductId);
    return res.json({ observations });
  } catch (err) {
    return next(err);
  }
}

async function createOutletOnboarding(req, res, next) {
  try {
    assertStorageUrisBelongToUser([req.body.photoStorageUri], req.user.uid);
    const db = getFirestore();
    const collection = db.collection('outletOnboarding');
    const ref = req.recordId ? collection.doc(req.recordId) : collection.doc();
    const data = {
      ...req.body,
      submittedBy: req.user.uid,
      status: 'pending_review',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const duplicate = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        if (existing.data().submittedBy !== req.user.uid) throw new ApiError(409, 'Idempotency key already used');
        return true;
      }
      transaction.create(ref, data);
      return false;
    });
    const snapshot = await ref.get();
    return res.status(duplicate ? 200 : 201).json({ onboarding: { id: snapshot.id, ...snapshot.data() }, duplicate });
  } catch (err) {
    return next(err);
  }
}

async function listOutletOnboarding(req, res, next) {
  try {
    let entries = await listDocs('outletOnboarding', {
      where: req.user.role === 'manager' ? [] : [['submittedBy', '==', req.user.uid]],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
    if (req.query.status) entries = entries.filter((entry) => entry.status === req.query.status);
    return res.json({ onboarding: entries });
  } catch (err) {
    return next(err);
  }
}

async function getOutletOnboardingPhotoUrl(req, res, next) {
  try {
    const snapshot = await getFirestore().collection('outletOnboarding').doc(req.params.id).get();
    if (!snapshot.exists) throw new ApiError(404, 'Outlet onboarding request not found');
    const entry = snapshot.data();
    if (req.user.role !== 'manager' && entry.submittedBy !== req.user.uid) {
      throw new ApiError(403, 'Not authorized to view this outlet photo');
    }
    const bucket = getStorageBucket();
    const prefix = `gs://${bucket.name}/merchandising/${entry.submittedBy}/`;
    if (typeof entry.photoStorageUri !== 'string' || !entry.photoStorageUri.startsWith(prefix)) {
      throw new ApiError(400, 'Outlet photo has an invalid storage path');
    }
    const objectPath = entry.photoStorageUri.slice(prefix.length);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(objectPath)) {
      throw new ApiError(400, 'Outlet photo has an invalid storage path');
    }
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const [url] = await bucket.file(`merchandising/${entry.submittedBy}/${objectPath}`).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });
    return res.json({ url, expiresAt: new Date(expiresAt).toISOString() });
  } catch (err) {
    return next(err);
  }
}

async function reviewOutletOnboarding(req, res, next) {
  try {
    const db = getFirestore();
    const onboardingRef = db.collection('outletOnboarding').doc(req.params.id);
    const outletRef = db.collection('outlets').doc();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(onboardingRef);
      if (!snapshot.exists) throw new ApiError(404, 'Outlet onboarding request not found');
      const record = snapshot.data();
      if (record.status !== 'pending_review') throw new ApiError(409, 'Onboarding request has already been reviewed');
      if (req.body.status === 'approved') {
        transaction.create(outletRef, {
          name: record.name,
          address: record.address,
          location: new admin.firestore.GeoPoint(record.location.lat, record.location.lng),
          assignedRepId: record.submittedBy,
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      transaction.update(onboardingRef, {
        status: req.body.status,
        ...(req.body.status === 'approved' ? { outletId: outletRef.id } : {}),
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewedBy: req.user.uid,
      });
    });
    const updated = await onboardingRef.get();
    return res.json({ onboarding: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireRepOrManager,
  createMerchandisingAudit,
  listMerchandisingAudits,
  updateMerchandisingAudit,
  deleteMerchandisingAudit,
  createCompetitorPrice,
  listCompetitorPrices,
  updateCompetitorPrice,
  deleteCompetitorPrice,
  createOutletOnboarding,
  listOutletOnboarding,
  getOutletOnboardingPhotoUrl,
  reviewOutletOnboarding,
};
