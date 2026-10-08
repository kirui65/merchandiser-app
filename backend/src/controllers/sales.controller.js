const { createDoc, getDoc, listDocs } = require('../services/firestore.service');
const { findExistingSaleByLocalId } = require('../utils/dedupe');
const { scopeCheck, teamScopeCheck } = require('../middleware/auth.middleware');
const { listTeamDocs } = require('../services/teamScope.service');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { assertCampaignForTeam } = require('../services/campaign.service');
const { getFirestore, admin } = require('../config/firebase');
const { canEditSale } = require('../services/saleMutation.service');
const { isActiveSale } = require('../models/sale.model');
const { recordAudit } = require('../services/audit.service');

/**
 * POST /api/sales
 * Idempotent on (repId, localId). A duplicate localId from the same rep is
 * NOT an error — we return the existing record with the same success-shaped
 * response, so the mobile sync manager can treat "duplicate" the same as
 * "synced" and never gets stuck re-queueing a sale the server already has
 * (e.g. connectivity dropped right after the original write committed but
 * before the ack reached the phone).
 */
async function createSale(req, res, next) {
  try {
    if (!['rep', 'manager'].includes(req.user.role)) {
      throw new ApiError(403, 'Sales can only be recorded by field representatives');
    }
    const repId = req.user.uid;
    const { localId, outletId, productId, qty, unitPrice, timestamp, photoUrl, campaignId } = req.body;
    const teamId = await getActiveTeamIdForUser(repId);
    await assertCampaignForTeam(campaignId, teamId);

    const existing = await findExistingSaleByLocalId(repId, localId);
    if (existing) {
      logger.info(`Duplicate localId ${localId} for rep ${repId} — returning existing sale ${existing.id}`);
      return res.status(200).json({ sale: existing, duplicate: true });
    }

    const total = Number((qty * unitPrice).toFixed(2));

    const sale = await createDoc('sales', {
      localId,
      repId,
      teamId,
      campaignId: campaignId || null,
      outletId,
      productId,
      qty,
      unitPrice,
      total,
      timestamp,
      photoUrl: photoUrl ?? null,
      syncStatus: 'synced',
      saleStatus: 'active',
    });

    return res.status(201).json({ sale, duplicate: false });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sales
 * Reps see only their own sales; managers can filter by ?repId=.
 */
async function listSales(req, res, next) {
  try {
    const { role, uid } = req.user;
    const where = [];
    let sales;
    if (role === 'team_leader') {
      sales = await listTeamDocs('sales', req.user.teamIds || []);
      if (req.query.repId) sales = sales.filter((sale) => sale.repId === req.query.repId);
    } else if (role === 'manager') {
      if (req.query.repId) where.push(['repId', '==', req.query.repId]);
      sales = await listDocs('sales', { where, orderBy: { field: 'timestamp', direction: 'desc' } });
    } else {
      where.push(['repId', '==', uid]);
      sales = await listDocs('sales', { where, orderBy: { field: 'timestamp', direction: 'desc' } });
    }

    if (req.query.outletId) sales = sales.filter((sale) => sale.outletId === req.query.outletId);
    return res.json({ sales });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sales/:id
 */
async function getSale(req, res, next) {
  try {
    const sale = await getDoc('sales', req.params.id);
    if (!sale) throw new ApiError(404, 'Sale not found');

    const allowed = req.user.role === 'team_leader'
      ? teamScopeCheck(req.user, sale.teamId)
      : scopeCheck(req.user, sale.repId);
    if (!allowed) {
      throw new ApiError(403, 'Not authorized to view this sale');
    }

    return res.json({ sale });
  } catch (err) {
    return next(err);
  }
}

async function updateSale(req, res, next) {
  try {
    if (!['rep', 'manager'].includes(req.user.role)) throw new ApiError(403, 'Sales can only be edited by field representatives or managers');
    const ref = getFirestore().collection('sales').doc(req.params.id);
    const before = await getDoc('sales', req.params.id);
    if (!before) throw new ApiError(404, 'Sale not found');
    if (!scopeCheck(req.user, before.repId)) throw new ApiError(403, 'Not authorized to edit this sale');
    if (!canEditSale(before)) throw new ApiError(409, 'Sales can only be edited for 15 minutes after they are created');
    const updated = await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new ApiError(404, 'Sale not found');
      const current = { id: snapshot.id, ...snapshot.data() };
      if (!scopeCheck(req.user, current.repId)) throw new ApiError(403, 'Not authorized to edit this sale');
      if (!canEditSale(current)) throw new ApiError(409, 'Sales can only be edited for 15 minutes after they are created');
      const fields = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      const qty = fields.qty ?? current.qty;
      const unitPrice = fields.unitPrice ?? current.unitPrice;
      fields.total = Number((qty * unitPrice).toFixed(2));
      transaction.update(ref, fields);
      return { ...current, ...req.body, total: fields.total };
    });

    await recordAudit(req, { action: 'edited', entityType: 'sale', entity: updated, changedFields: Object.keys(req.body) });
    return res.json({ sale: updated });
  } catch (err) {
    return next(err);
  }
}

async function voidSale(req, res, next) {
  try {
    if (!['rep', 'manager'].includes(req.user.role)) throw new ApiError(403, 'Sales can only be voided by field representatives or managers');
    const ref = getFirestore().collection('sales').doc(req.params.id);
    const updated = await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new ApiError(404, 'Sale not found');
      const current = { id: snapshot.id, ...snapshot.data() };
      if (!scopeCheck(req.user, current.repId)) throw new ApiError(403, 'Not authorized to void this sale');
      if (!isActiveSale(current)) {
        if (current.voidReason === req.body.reason) return { ...current, duplicate: true };
        throw new ApiError(409, 'Sale has already been voided');
      }
      const fields = {
        saleStatus: 'voided',
        voidReason: req.body.reason,
        voidedAt: admin.firestore.FieldValue.serverTimestamp(),
        voidedBy: req.user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.update(ref, fields);
      return { ...current, saleStatus: fields.saleStatus, voidReason: fields.voidReason, voidedBy: fields.voidedBy };
    });

    await recordAudit(req, { action: 'voided', entityType: 'sale', entity: updated, changedFields: ['saleStatus', 'voidReason'] });
    return res.json({ sale: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createSale, listSales, getSale, updateSale, voidSale };
