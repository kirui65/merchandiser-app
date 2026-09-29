const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

function distanceInMeters(from, to) {
	const earthRadius = 6371000;
	const lat1 = (from.lat * Math.PI) / 180;
	const lat2 = (to.lat * Math.PI) / 180;
	const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
	const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
	const a = Math.sin(deltaLat / 2) ** 2
		+ Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
	return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findVisitedOutletIds(pings, outlets, radiusMeters = DEFAULT_GEOFENCE_RADIUS_METERS) {
	const visited = new Set();
	for (const ping of pings) {
		for (const outlet of outlets) {
			const location = outlet.location;
			const outletPoint = location?._latitude !== undefined
				? { lat: location._latitude, lng: location._longitude }
				: location;
			if (outletPoint?.lat === undefined || outletPoint?.lng === undefined) continue;
			if (distanceInMeters(ping, outletPoint) <= radiusMeters) visited.add(outlet.id);
		}
	}
	return [...visited];
}

function findRouteAnomalies(routes, reps, maxSpeedKph = 160) {
	const names = Object.fromEntries(reps.map((rep) => [rep.id, rep.name]));
	const anomalies = [];
	for (const route of routes) {
		const pings = [...(route.pings || [])].filter((ping) => Number.isFinite(Number(ping.lat)) && Number.isFinite(Number(ping.lng)) && Number.isFinite(new Date(ping.timestamp).getTime())).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
		for (let index = 1; index < pings.length; index += 1) {
			const previous = pings[index - 1];
			const current = pings[index];
			const elapsedHours = (new Date(current.timestamp) - new Date(previous.timestamp)) / 3600000;
			if (elapsedHours <= 0) continue;
			const speedKph = distanceInMeters(previous, current) / 1000 / elapsedHours;
			if (speedKph > maxSpeedKph) anomalies.push({ routeId: route.id, repId: route.repId, repName: names[route.repId] || 'Unknown rep', date: route.date, speedKph: Math.round(speedKph), timestamp: current.timestamp });
		}
	}
	return anomalies;
}

module.exports = { distanceInMeters, findVisitedOutletIds, findRouteAnomalies, DEFAULT_GEOFENCE_RADIUS_METERS };
