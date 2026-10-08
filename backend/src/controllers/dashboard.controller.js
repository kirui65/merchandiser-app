const { listDocs } = require('../services/firestore.service');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');
const { reconcileRecords } = require('../services/reconciliation.service');
const { findRouteAnomalies } = require('../services/geo.service');
const { isActiveSale } = require('../models/sale.model');

function millis(value) {
  if (value?.toMillis) return value.toMillis();
  return new Date(value).getTime();
}

function withinRange(value, from, to) {
  const time = millis(value);
  return Number.isFinite(time) && time >= from.getTime() && time <= to.getTime();
}

async function getInsights(req, res, next) {
  try {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new ApiError(400, 'A valid from/to date range is required');
    const duration = to.getTime() - from.getTime() + 1;
    const previousFrom = new Date(from.getTime() - duration);
    const previousTo = new Date(from.getTime() - 1);
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = to.toISOString().slice(0, 10);
    const [sales, previousSales, transactions, routes, outlets, reps, products, territories, targets, auditEntries, securityEvents, failedLoginEvents] = await Promise.all([
      listDocs('sales', { where: [['timestamp', '>=', from.toISOString()], ['timestamp', '<=', to.toISOString()]] }),
      listDocs('sales', { where: [['timestamp', '>=', previousFrom.toISOString()], ['timestamp', '<=', previousTo.toISOString()]] }),
      listDocs('mpesaTransactions', { where: [['timestamp', '>=', from.toISOString()], ['timestamp', '<=', to.toISOString()]] }),
      listDocs('routes', { where: [['date', '>=', fromDate], ['date', '<=', toDate]] }), listDocs('outlets'), listDocs('reps'), listDocs('products'), listDocs('territories'),
      listDocs('salesTargets', { where: [['month', '==', from.toISOString().slice(0, 7)]] }),
      listDocs('auditLog', { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 100 }),
      listDocs('securityEvents', { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 250 }),
      listDocs('securityEvents', { where: [['event', '==', 'login_failed'], ['createdAt', '>=', from], ['createdAt', '<=', to]], limit: 500 }),
    ]);
    const repById = Object.fromEntries(reps.map((rep) => [rep.id, rep]));
    const outletById = Object.fromEntries(outlets.map((outlet) => [outlet.id, outlet]));
    const productById = Object.fromEntries(products.map((product) => [product.id, product]));
    const territoryById = Object.fromEntries(territories.map((territory) => [territory.id, territory]));
    const targetByRep = Object.fromEntries(targets.map((target) => [target.repId, Number(target.amount || 0)]));
      const territoryOutletIds = req.query.territoryId ? new Set(outlets.filter((outlet) => req.query.territoryId === 'unassigned' ? !outlet.territoryId : outlet.territoryId === req.query.territoryId).map((outlet) => outlet.id)) : null;
    const selected = (sale) => isActiveSale(sale)
      && (!territoryOutletIds || territoryOutletIds.has(sale.outletId))
      && (!req.query.repId || sale.repId === req.query.repId)
      && (!req.query.outletId || sale.outletId === req.query.outletId)
      && (!req.query.productId || sale.productId === req.query.productId);
    const currentSales = sales.filter(selected);
    const filteredPreviousSales = previousSales.filter(selected);
    const currentTotal = currentSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const previousTotal = filteredPreviousSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const filteredTransactions = transactions.filter((transaction) => (!territoryOutletIds || territoryOutletIds.has(transaction.outletId))
      && (!req.query.repId || transaction.repId === req.query.repId)
      && (!req.query.outletId || transaction.outletId === req.query.outletId));
    const completedTransactions = filteredTransactions.filter((transaction) => transaction.status === 'completed');
    const reconciliation = reconcileRecords(currentSales, completedTransactions);
    const matchingRoutes = routes.filter((route) => !req.query.repId || route.repId === req.query.repId);
    const currentRoutes = territoryOutletIds || req.query.outletId ? matchingRoutes.map((route) => ({ ...route, plannedOutletIds: (route.plannedOutletIds || []).filter((id) => (!territoryOutletIds || territoryOutletIds.has(id)) && (!req.query.outletId || id === req.query.outletId)), visitedOutletIds: (route.visitedOutletIds || []).filter((id) => (!territoryOutletIds || territoryOutletIds.has(id)) && (!req.query.outletId || id === req.query.outletId)) })) : matchingRoutes;
    const planned = currentRoutes.reduce((sum, route) => sum + (route.plannedOutletIds || []).length, 0);
    const visited = currentRoutes.reduce((sum, route) => sum + (route.visitedOutletIds || []).filter((id) => (route.plannedOutletIds || []).includes(id)).length, 0);
    const territorySales = {};
    const repSales = {};
    const latestSaleByRep = {};
    currentSales.forEach((sale) => {
      const outlet = outletById[sale.outletId];
      const territoryId = outlet?.territoryId || 'unassigned';
      territorySales[territoryId] = (territorySales[territoryId] || 0) + Number(sale.total || 0);
      repSales[sale.repId] = (repSales[sale.repId] || 0) + Number(sale.total || 0);
      if (!latestSaleByRep[sale.repId] || millis(sale.timestamp) > millis(latestSaleByRep[sale.repId])) latestSaleByRep[sale.repId] = sale.timestamp;
    });
    const recentSales = [...currentSales].sort((a, b) => millis(b.timestamp) - millis(a.timestamp)).slice(0, 8).map((sale) => ({
      id: sale.id, repId: sale.repId, repName: repById[sale.repId]?.name || 'Unknown rep', outletName: outletById[sale.outletId]?.name || 'Unknown outlet',
      productName: productById[sale.productId]?.name || 'Unknown product', total: Number(sale.total || 0), timestamp: sale.timestamp,
    }));
    const latestSecurityEvents = securityEvents.slice(0, 8).map((event) => ({ id: event.id, event: event.event, email: event.email, actorId: event.actorId, actorRole: event.actorRole, createdAt: event.createdAt }));
    return res.json({
      comparison: { current: currentTotal, previous: previousTotal, changePercent: previousTotal ? (currentTotal - previousTotal) / previousTotal * 100 : null, currentCount: currentSales.length, previousCount: previousSales.length },
      recentSales,
      payments: { matchedCount: reconciliation.matches.length, unmatchedSales: reconciliation.unmatchedSales.length, unmatchedTransactions: reconciliation.unmatchedTransactions.length, unmatchedSalesTotal: reconciliation.unmatchedSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0), unmatchedPaymentsTotal: reconciliation.unmatchedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0), pendingCount: filteredTransactions.filter((transaction) => transaction.status === 'pending').length, failedCount: filteredTransactions.filter((transaction) => transaction.status === 'failed').length },
      visits: { planned, visited, completionPercent: planned ? visited / planned * 100 : 0 },
      territories: Object.entries(territorySales).map(([id, total]) => ({ id, name: territoryById[id]?.name || 'Unassigned', total })).sort((a, b) => b.total - a.total).slice(0, 8),
      repActivity: reps.filter((rep) => rep.role === 'rep' && rep.active !== false).map((rep) => ({ id: rep.id, name: rep.name, sales: repSales[rep.id] || 0, lastSaleAt: latestSaleByRep[rep.id] || null, target: targetByRep[rep.id] || 0 })).sort((a, b) => b.sales - a.sales).slice(0, 8),
      routeAnomalies: findRouteAnomalies(currentRoutes, reps).slice(0, 8),
      auditEntries: auditEntries.slice(0, 8),
      security: { failedLogins: failedLoginEvents.length, failedLoginsCapped: failedLoginEvents.length === 500, recentEvents: latestSecurityEvents, inactiveAccounts: reps.filter((rep) => rep.active === false).length, managerAccounts: reps.filter((rep) => rep.role === 'manager' && rep.active !== false).length, mfaEnabledManagers: reps.filter((rep) => rep.role === 'manager' && rep.active !== false && rep.mfaEnabled === true).length },
      integrations: { firestore: 'connected', mpesaConfigured: Boolean(env.daraja.consumerKey && env.daraja.consumerSecret && env.daraja.shortcode && env.daraja.passkey && env.daraja.callbackUrl), lastMpesaEvent: filteredTransactions.filter((transaction) => ['completed', 'failed'].includes(transaction.status)).sort((a, b) => millis(b.timestamp) - millis(a.timestamp))[0]?.timestamp || null },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/dashboard/totals?from=ISO&to=ISO
 * Managers receive the full aggregate. Reps receive only their own current
 * monthly standing, so the mobile leaderboard never exposes colleagues' sales.
 * Fine at Phase-1 scale (single-tenant, modest daily sale volume); if this
 * becomes a bottleneck, precompute daily rollup docs on write instead of
 * aggregating on read.
 */
async function getTotals(req, res, next) {
  try {
    const where = [];
    const isRep = req.user.role !== 'manager';
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    if (isRep) {
      where.push(['timestamp', '>=', monthStart.toISOString()]);
    } else {
      if (req.query.from) where.push(['timestamp', '>=', req.query.from]);
      if (req.query.to) where.push(['timestamp', '<=', req.query.to]);
    }

    let sales = await listDocs('sales', { where });
    sales = sales.filter(isActiveSale);
    if (req.user.role === 'manager') sales = sales.filter((sale) => (!req.query.repId || sale.repId === req.query.repId) && (!req.query.outletId || sale.outletId === req.query.outletId) && (!req.query.productId || sale.productId === req.query.productId));
      if (req.user.role === 'manager' && req.query.territoryId) {
        const outlets = req.query.territoryId === 'unassigned' ? await listDocs('outlets') : await listDocs('outlets', { where: [['territoryId', '==', req.query.territoryId]] });
      const outletIds = new Set(outlets.map((outlet) => outlet.id));
        sales = sales.filter((sale) => outletIds.has(sale.outletId) && (req.query.territoryId !== 'unassigned' || !outlets.find((outlet) => outlet.id === sale.outletId)?.territoryId));
    }

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

    if (isRep) {
      const reps = await listDocs('reps');
      const standings = reps
        .filter((rep) => rep.role === 'rep' && rep.active !== false)
        .map((rep) => ({ repId: rep.id, total: Number(byRep[rep.id] || 0) }))
        .sort((a, b) => b.total - a.total || a.repId.localeCompare(b.repId));
      const rank = Math.max(1, standings.findIndex((entry) => entry.repId === req.user.uid) + 1);
      return res.json({
        month: monthStart.toISOString().slice(0, 7),
        rank,
        total: Number(byRep[req.user.uid] || 0),
        participantCount: standings.length,
      });
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
    const routeWhere = [['date', '>=', cutoff.toISOString().slice(0, 10)]];
    if (req.query.repId) routeWhere.push(['repId', '==', req.query.repId]);
    const routes = await listDocs('routes', { where: routeWhere });
    const recentlyVisitedIds = new Set(routes.flatMap((route) => route.visitedOutletIds || []));
    const outletWhere = [];
    if (req.query.territoryId && req.query.territoryId !== 'unassigned') outletWhere.push(['territoryId', '==', req.query.territoryId]);
    if (req.query.repId) outletWhere.push(['assignedRepId', '==', req.query.repId]);
    let outlets = await listDocs('outlets', { where: outletWhere });
    if (req.query.territoryId === 'unassigned') outlets = outlets.filter((outlet) => !outlet.territoryId);
    if (req.query.outletId) outlets = outlets.filter((outlet) => outlet.id === req.query.outletId);
    const overdueOutlets = outlets.filter((outlet) => outlet.active !== false && !recentlyVisitedIds.has(outlet.id));

    return res.json({ days: configuredDays, overdueOutlets });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getTotals, getOverdueOutlets, getInsights };
