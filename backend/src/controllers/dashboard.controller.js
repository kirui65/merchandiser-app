const { listDocs } = require('../services/firestore.service');

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

module.exports = { getTotals };
