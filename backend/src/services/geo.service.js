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

module.exports = { distanceInMeters, findVisitedOutletIds, DEFAULT_GEOFENCE_RADIUS_METERS };
