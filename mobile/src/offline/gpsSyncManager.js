import { postPingBatch } from '../api/routes';
import { subscribeToConnectivity, isCurrentlyOnline } from '../utils/netInfo';

const BATCH_SIZE = 100;

export function createGpsSyncManager({ queue, api = { postPingBatch }, isOnline }) {
  let syncing = false;

  async function syncPendingPings() {
    if (syncing || !isOnline()) return { skipped: true };
    syncing = true;
    try {
      const pending = queue.getPendingPings(BATCH_SIZE);
      if (!pending.length) return { synced: 0, failed: 0 };
      const response = await api.postPingBatch(pending.map(({ lat, lng, timestamp }) => ({ lat, lng, timestamp })));
      if (response.status >= 200 && response.status < 300) {
        queue.markPingsSynced(pending.map((ping) => ping.id));
        return { synced: pending.length, failed: 0 };
      }
      queue.markPingsFailed(pending.map((ping) => ping.id), `HTTP ${response.status}`);
      return { synced: 0, failed: pending.length };
    } catch (error) {
      const pending = queue.getPendingPings(BATCH_SIZE);
      queue.markPingsFailed(pending.map((ping) => ping.id), error.message || String(error));
      return { synced: 0, failed: pending.length, error };
    } finally {
      syncing = false;
    }
  }

  function start() {
    const unsubscribe = subscribeToConnectivity((online) => {
      if (online) syncPendingPings();
    });
    const interval = setInterval(syncPendingPings, 30 * 1000);
    isCurrentlyOnline().then((online) => { if (online) syncPendingPings(); });
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }

  return { syncPendingPings, isSyncing: () => syncing, start };
}