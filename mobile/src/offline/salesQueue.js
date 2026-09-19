// Local write + read operations for the pending-sales SQLite queue.
// Every sale write goes here FIRST (marked 'pending'), before any network
// call is attempted — this is what makes the app offline-first rather than
// offline-tolerant.

import { getDb } from './db';

/**
 * Enqueue a new sale locally. Returns the localId used as the idempotency
 * key when this row is later synced to the backend.
 */
export function enqueueSale(localId, payload) {
  const db = getDb();
  db.runSync(
    `INSERT INTO pending_sales (localId, payload, syncStatus, attempts, createdAt)
     VALUES (?, ?, 'pending', 0, ?);`,
    [localId, JSON.stringify(payload), new Date().toISOString()]
  );
}

export function getPendingSales() {
  const db = getDb();
  const rows = db.getAllSync(`SELECT * FROM pending_sales WHERE syncStatus IN ('pending', 'failed') ORDER BY createdAt ASC;`);
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}

export function markSynced(localId) {
  const db = getDb();
  db.runSync(`UPDATE pending_sales SET syncStatus = 'synced', lastError = NULL WHERE localId = ?;`, [localId]);
}

export function markFailed(localId, errorMessage) {
  const db = getDb();
  db.runSync(
    `UPDATE pending_sales SET syncStatus = 'failed', attempts = attempts + 1, lastError = ? WHERE localId = ?;`,
    [String(errorMessage).slice(0, 500), localId]
  );
}

export function getAttempts(localId) {
  const db = getDb();
  const row = db.getFirstSync(`SELECT attempts FROM pending_sales WHERE localId = ?;`, [localId]);
  return row ? row.attempts : 0;
}
