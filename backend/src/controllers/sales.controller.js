const { createDoc, getDoc, listDocs } = require('../services/firestore.service');
const { findExistingSaleByLocalId } = require('../utils/dedupe');
const { scopeCheck } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

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
    const repId = req.user.uid;
    const { localId, outletId, productId, qty, unitPrice, timestamp, photoUrl } = req.body;

    const existing = await findExistingSaleByLocalId(repId, localId);
    if (existing) {
      logger.info(`Duplicate localId ${localId} for rep ${repId} — returning existing sale ${existing.id}`);
      return res.status(200).json({ sale: existing, duplicate: true });
    }

    const total = Number((qty * unitPrice).toFixed(2));

    const sale = await createDoc('sales', {
      localId,
      repId,
      outletId,
      productId,
      qty,
      unitPrice,
      total,
      timestamp,
      photoUrl: photoUrl ?? null,
      syncStatus: 'synced',
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

    if (role === 'manager') {
      if (req.query.repId) where.push(['repId', '==', req.query.repId]);
    } else {
      where.push(['repId', '==', uid]);
    }

    if (req.query.outletId) where.push(['outletId', '==', req.query.outletId]);

    const sales = await listDocs('sales', { where, orderBy: { field: 'timestamp', direction: 'desc' } });
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

    if (!scopeCheck(req.user, sale.repId)) {
      throw new ApiError(403, 'Not authorized to view this sale');
    }

    return res.json({ sale });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createSale, listSales, getSale };
