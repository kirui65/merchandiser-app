import { getDb } from './db';

export function enqueueActivation(localId, payload) {
  const now = new Date().toISOString();
  const db = getDb();
  db.runSync(
    `INSERT INTO pending_activations
      (localId, payload, activationStatus, revision, remoteExists, syncStatus, attempts, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 0, 'pending', 0, ?, ?)
     ON CONFLICT(localId) DO UPDATE SET
       payload = excluded.payload,
       activationStatus = excluded.activationStatus,
       revision = revision + 1,
       syncStatus = 'pending',
       lastError = NULL,
       updatedAt = excluded.updatedAt;`,
    [localId, JSON.stringify(payload), payload.status, now, now],
  );
}

export function getPendingActivations() {
  return getDb()
    .getAllSync(
      `SELECT localId, payload, revision, remoteExists FROM pending_activations
       WHERE syncStatus IN ('pending', 'failed') ORDER BY createdAt ASC;`,
    )
    .map((row) => ({ ...row, payload: JSON.parse(row.payload), remoteExists: row.remoteExists === 1 }));
}

export function getActiveActivation() {
  const row = getDb().getFirstSync(
    `SELECT localId, payload FROM pending_activations
     WHERE activationStatus = 'draft' ORDER BY updatedAt DESC LIMIT 1;`,
  );
  return row ? { localId: row.localId, payload: JSON.parse(row.payload) } : null;
}

export function getLocalActivations() {
  return getDb()
    .getAllSync(
      `SELECT localId, payload, syncStatus, lastError FROM pending_activations
       ORDER BY createdAt DESC;`,
    )
    .map((row) => ({
      ...JSON.parse(row.payload),
      id: row.localId,
      localSyncStatus: row.syncStatus,
      localSyncError: row.lastError,
    }));
}

export function markActivationSynced(localId, revision) {
  getDb().runSync(
    `UPDATE pending_activations SET remoteExists = 1,
     syncStatus = CASE WHEN revision = ? THEN 'synced' ELSE syncStatus END,
     attempts = CASE WHEN revision = ? THEN 0 ELSE attempts END,
     lastError = CASE WHEN revision = ? THEN NULL ELSE lastError END,
     updatedAt = ? WHERE localId = ?;`,
    [revision, revision, revision, new Date().toISOString(), localId],
  );
}

export function markActivationFailed(localId, errorMessage, revision) {
  getDb().runSync(
    `UPDATE pending_activations SET syncStatus = 'failed', attempts = attempts + 1,
     lastError = ?, updatedAt = ? WHERE localId = ? AND revision = ?;`,
    [String(errorMessage).slice(0, 500), new Date().toISOString(), localId, revision],
  );
}
