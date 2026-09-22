const { getDoc, listDocs, setDoc } = require('../services/firestore.service');
const { findVisitedOutletIds, DEFAULT_GEOFENCE_RADIUS_METERS } = require('../services/geo.service');
const { ApiError } = require('../middleware/errorHandler');
const env = require('../config/env');

function dateFromRequest(req) {
	return req.query.date || new Date().toISOString().slice(0, 10);
}

async function getRoute(req, res, next) {
	try {
		const repId = req.user.role === 'manager' ? (req.query.repId || req.user.uid) : req.user.uid;
		const route = await getDoc('routes', `${repId}_${dateFromRequest(req)}`);
		return res.json({ route: route || { id: `${repId}_${dateFromRequest(req)}`, repId, date: dateFromRequest(req), pings: [], plannedOutletIds: [], visitedOutletIds: [] } });
	} catch (err) {
		return next(err);
	}
}

async function getRouteHistory(req, res, next) {
	try {
		const repId = req.user.role === 'manager' ? (req.query.repId || req.user.uid) : req.user.uid;
		const routes = await listDocs('routes', {
			where: [['repId', '==', repId]],
			orderBy: { field: 'date', direction: 'desc' },
			limit: Math.min(Number(req.query.limit) || 30, 90),
		});
		return res.json({ routes });
	} catch (err) {
		return next(err);
	}
}

async function appendPings(req, res, next) {
	try {
		const date = dateFromRequest(req);
		const repId = req.user.uid;
		const routeId = `${repId}_${date}`;
		const existing = await getDoc('routes', routeId);
		const existingPings = existing?.pings || [];
		const incoming = req.body.pings.filter((ping) => !existingPings.some((item) => item.timestamp === ping.timestamp && item.lat === ping.lat && item.lng === ping.lng));
		const pings = [...existingPings, ...incoming].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
		const plannedOutletIds = existing?.plannedOutletIds || [];
		const outlets = plannedOutletIds.length
			? await Promise.all(plannedOutletIds.map((id) => getDoc('outlets', id)))
			: [];
		const visitedFromPings = findVisitedOutletIds(pings, outlets.filter(Boolean), env.geofenceRadiusMeters || DEFAULT_GEOFENCE_RADIUS_METERS);
		const visitedOutletIds = [...new Set([...(existing?.visitedOutletIds || []), ...visitedFromPings])];
		const route = { id: routeId, repId, date, pings, plannedOutletIds, visitedOutletIds };
		await setDoc('routes', routeId, route);
		return res.status(200).json({ route, accepted: incoming.length, duplicate: incoming.length === 0 });
	} catch (err) {
		return next(err);
	}
}

async function setPlannedOutlets(req, res, next) {
	try {
		const repId = req.user.role === 'manager' ? req.body.repId : req.user.uid;
		if (!repId) throw new ApiError(400, 'repId is required');
		const date = req.body.date;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'date must be YYYY-MM-DD');
		const routeId = `${repId}_${date}`;
		const existing = await getDoc('routes', routeId);
		const route = { id: routeId, repId, date, pings: existing?.pings || [], visitedOutletIds: existing?.visitedOutletIds || [], plannedOutletIds: req.body.plannedOutletIds || [] };
		await setDoc('routes', routeId, route);
		return res.json({ route });
	} catch (err) {
		return next(err);
	}
}

module.exports = { getRoute, getRouteHistory, appendPings, setPlannedOutlets };
