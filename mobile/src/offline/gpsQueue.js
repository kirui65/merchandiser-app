import { getDb } from './db';

export function enqueuePing(ping) {
	getDb().runSync(
		`INSERT OR IGNORE INTO pending_pings (lat, lng, timestamp, createdAt)
		 VALUES (?, ?, ?, ?);`,
		[ping.lat, ping.lng, ping.timestamp, new Date().toISOString()],
	);
}

export function getPendingPings(limit = 500) {
	return getDb().getAllSync(
		`SELECT id, lat, lng, timestamp FROM pending_pings
		 WHERE syncStatus IN ('pending', 'failed') ORDER BY id ASC LIMIT ?;`,
		[limit],
	);
}

export function markPingsSynced(ids) {
	if (!ids.length) return;
	const db = getDb();
	db.withTransactionSync(() => {
		for (const id of ids) db.runSync('DELETE FROM pending_pings WHERE id = ?;', [id]);
	});
}

export function markPingsFailed(ids, errorMessage) {
	if (!ids.length) return;
	const db = getDb();
	db.withTransactionSync(() => {
		for (const id of ids) {
			db.runSync(
				`UPDATE pending_pings SET syncStatus = 'failed', attempts = attempts + 1, lastError = ? WHERE id = ?;`,
				[String(errorMessage).slice(0, 500), id],
			);
		}
	});
}
