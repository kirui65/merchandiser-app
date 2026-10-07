const { createDoc, getDoc, listDocs } = require('../services/firestore.service');
const { findExistingSaleByLocalId } = require('../utils/dedupe');
const { scopeCheck, teamScopeCheck } = require('../middleware/auth.middleware');
const { listTeamDocs } = require('../services/teamScope.service');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { assertCampaignForTeam } = require('../services/campaign.service');

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

module.exports = { createSale, listSales, getSale };
