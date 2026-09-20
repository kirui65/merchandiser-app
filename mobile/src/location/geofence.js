export function distanceInMeters(from, to) {
	const earthRadius = 6371000;
	const lat1 = from.lat * Math.PI / 180;
	const lat2 = to.lat * Math.PI / 180;
	const deltaLat = (to.lat - from.lat) * Math.PI / 180;
	const deltaLng = (to.lng - from.lng) * Math.PI / 180;
	const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
	return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isWithinGeofence(ping, outlet, radiusMeters = 100) {
	return distanceInMeters(ping, outlet.location) <= radiusMeters;
}

export function findMissedOutletIds(plannedOutlets, visitedOutletIds) {
	const visited = new Set(visitedOutletIds);
	return plannedOutlets.filter((outlet) => !visited.has(outlet.id)).map((outlet) => outlet.id);
}
