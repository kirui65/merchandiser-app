// Background sync orchestration for the offline sales queue.
//
// Deliberately written with injectable dependencies (queue + api client)
// rather than importing SQLite/axios directly, so this module can be
// unit-tested with mocked network state and a mocked queue BEFORE it is
// wired into any screen — per the project's build order.
//
// Key correctness property: syncing must be safe to retry. If the network
// drops right after the backend commits a sale but before the response
// reaches the phone, the next sync attempt re-POSTs the same localId. The
// backend treats that as a duplicate and returns 200 with the existing
// record (see backend/src/controllers/sales.controller.js) — NOT an error —
// so this manager must mark the item 'synced' on both a fresh 201 and a
// duplicate 200, never leave it stuck retrying.

/**
 * @typedef {object} QueueAdapter
 * @property {() => Array<{localId: string, payload: object}>} getPendingSales
 * @property {(localId: string) => void} markSynced
 * @property {(localId: string, errorMessage: string) => void} markFailed
 */

/**
 * @typedef {object} ApiClient
 * @property {(sale: object) => Promise<{status: number, data: any}>} postSale
 */

const MAX_ATTEMPTS_BEFORE_BACKOFF_CAP = 5;

export function createSyncManager({ queue, api, isOnline }) {
  let syncing = false;

  /**
   * Attempts to push every pending/failed sale in the local queue to the
   * backend. Safe to call repeatedly (e.g. on every connectivity-restored
   * event) — it no-ops if a sync is already in flight or the device is
   * offline.
   */
  async function syncPendingSales() {
    if (syncing) return { skipped: true, reason: 'already-syncing' };
    if (!isOnline()) return { skipped: true, reason: 'offline' };

    syncing = true;
    const results = { synced: 0, duplicates: 0, failed: 0, errors: [] };

    try {
      const pending = queue.getPendingSales();

      for (const item of pending) {
        try {
          const response = await api.postSale({ localId: item.localId, ...item.payload });

          // 201 = newly created, 200 = duplicate localId already on the
          // server (dropped ack on a prior attempt) — both are "done".
          if (response.status === 201 || response.status === 200) {
            queue.markSynced(item.localId);
            if (response.data && response.data.duplicate) {
              results.duplicates += 1;
            } else {
              results.synced += 1;
            }
          } else if (response.status >= 400 && response.status < 500) {
            // Client error (e.g. validation failure) — not transient.
            // Mark failed but do not keep hammering it every sync cycle
            // beyond the attempt cap; surface it for manual review instead.
            queue.markFailed(item.localId, `HTTP ${response.status}: ${JSON.stringify(response.data)}`);
            results.failed += 1;
          } else {
            // Server error / unexpected — treat as transient, eligible for retry.
            queue.markFailed(item.localId, `HTTP ${response.status}`);
            results.failed += 1;
          }
        } catch (err) {
          // Network-level failure mid-request — transient, eligible for retry.
          queue.markFailed(item.localId, err.message || String(err));
          results.failed += 1;
          results.errors.push({ localId: item.localId, error: err.message || String(err) });
        }
      }
    } finally {
      syncing = false;
    }

    return results;
  }

  function isSyncing() {
    return syncing;
  }

  return { syncPendingSales, isSyncing, MAX_ATTEMPTS_BEFORE_BACKOFF_CAP };
}
