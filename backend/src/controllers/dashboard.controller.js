const { listDocs } = require('../services/firestore.service');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

/**
 * GET /api/dashboard/totals?from=ISO&to=ISO
 * Manager-only. Aggregates sales by rep / outlet / product / day in-memory.
 * Fine at Phase-1 scale (single-tenant, modest daily sale volume); if this
 * becomes a bottleneck, precompute daily rollup docs on write instead of
 * aggregating on read.
 */
async function getTotals(req, res, next) {
  try {
    const where = [];
    if (req.query.from) where.push(['timestamp', '>=', req.query.from]);
    if (req.query.to) where.push(['timestamp', '<=', req.query.to]);

    const sales = await listDocs('sales', { where });

    const byRep = {};
    const byOutlet = {};
    const byProduct = {};
    const byDay = {};
    let grandTotal = 0;

    for (const sale of sales) {
      grandTotal += sale.total || 0;

      byRep[sale.repId] = (byRep[sale.repId] || 0) + sale.total;
      byOutlet[sale.outletId] = (byOutlet[sale.outletId] || 0) + sale.total;
      byProduct[sale.productId] = (byProduct[sale.productId] || 0) + sale.total;

      const day = String(sale.timestamp).slice(0, 10);
      byDay[day] = (byDay[day] || 0) + sale.total;
    }

    return res.json({
      grandTotal: Number(grandTotal.toFixed(2)),
      count: sales.length,
      byRep,
      byOutlet,
      byProduct,
      byDay,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/dashboard/overdue-outlets?days=7
 * Manager-only. A visit is the route geofence signal already persisted on a
 * route document; this deliberately does not infer a visit from a sale.
 */
async function getOverdueOutlets(req, res, next) {
  try {
    const configuredDays = Number(req.query.days || env.outletOverdueDays);
    if (!Number.isInteger(configuredDays) || configuredDays < 1 || configuredDays > 365) {
      throw new ApiError(400, 'days must be an integer between 1 and 365');
    }

    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - configuredDays);
    const routes = await listDocs('routes', { where: [['date', '>=', cutoff.toISOString().slice(0, 10)]] });
    const recentlyVisitedIds = new Set(routes.flatMap((route) => route.visitedOutletIds || []));
    const outlets = await listDocs('outlets');
    const overdueOutlets = outlets.filter((outlet) => outlet.active !== false && !recentlyVisitedIds.has(outlet.id));

    return res.json({ days: configuredDays, overdueOutlets });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getTotals, getOverdueOutlets };
