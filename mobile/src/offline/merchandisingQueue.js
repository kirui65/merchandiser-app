import { getDb } from './db';

export function enqueueMerchandisingRecord(localId, recordType, payload) {
  const now = new Date().toISOString();
  getDb().runSync(
    `INSERT INTO pending_merchandising
      (localId, recordType, payload, syncStatus, attempts, createdAt, updatedAt)
     VALUES (?, ?, ?, 'pending', 0, ?, ?);`,
    [localId, recordType, JSON.stringify(payload), now, now],
  );
}

export function getPendingMerchandisingRecords() {
  return getDb()
    .getAllSync(
      `SELECT localId, recordType, payload FROM pending_merchandising
       WHERE syncStatus IN ('pending', 'failed') ORDER BY createdAt ASC;`,
    )
    .map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

export function getLocalMerchandisingRecords(recordType) {
  return getDb()
    .getAllSync(
      `SELECT localId, recordType, payload, syncStatus, lastError
       FROM pending_merchandising WHERE recordType = ? ORDER BY createdAt DESC;`,
      [recordType],
    )
    .map((row) => ({
      ...JSON.parse(row.payload),
      id: row.localId,
      localSyncStatus: row.syncStatus,
      localSyncError: row.lastError,
    }));
}

export function markMerchandisingSynced(localId) {
  getDb().runSync(
    `UPDATE pending_merchandising SET syncStatus = 'synced', attempts = 0,
     lastError = NULL, updatedAt = ? WHERE localId = ?;`,
    [new Date().toISOString(), localId],
  );
}

export function markMerchandisingFailed(localId, errorMessage) {
  getDb().runSync(
    `UPDATE pending_merchandising SET syncStatus = 'failed', attempts = attempts + 1,
     lastError = ?, updatedAt = ? WHERE localId = ?;`,
    [String(errorMessage).slice(0, 500), new Date().toISOString(), localId],
  );
}
