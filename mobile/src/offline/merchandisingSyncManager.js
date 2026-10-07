const BATCH_SIZE = 20;

function mediaIdFor(localId, index) {
  return `${localId.slice(0, 24)}${index.toString(16).padStart(12, '0')}`;
}

async function uploadPayloadPhotos(recordType, payload, uploadPhoto, localId) {
  if (recordType === 'audit') {
    const photoStorageUris = [];
    for (const [index, uri] of payload.photoStorageUris.entries()) {
      photoStorageUris.push(uri.startsWith('file://') ? await uploadPhoto(uri, mediaIdFor(localId, index)) : uri);
    }
    return { ...payload, photoStorageUris };
  }
  if (recordType === 'competitorPrice' && payload.photoStorageUri?.startsWith('file://')) {
    return { ...payload, photoStorageUri: await uploadPhoto(payload.photoStorageUri, mediaIdFor(localId, 0)) };
  }
  if (recordType === 'outletOnboarding' && payload.photoStorageUri.startsWith('file://')) {
    return { ...payload, photoStorageUri: await uploadPhoto(payload.photoStorageUri, mediaIdFor(localId, 0)) };
  }
  return payload;
}

export function createMerchandisingSyncManager({ queue, api, uploadPhoto, isOnline, subscribeToConnectivity }) {
  let syncing = false;

  async function syncPendingRecords() {
    if (syncing || !(await isOnline())) return { skipped: true };
    syncing = true;
    const results = { synced: 0, failed: 0, errors: [] };
    try {
      const pending = queue.getPendingMerchandisingRecords().slice(0, BATCH_SIZE);
      for (const item of pending) {
        try {
          const payload = await uploadPayloadPhotos(item.recordType, item.payload, uploadPhoto, item.localId);
          const response = await api.createRecord(item.recordType, item.localId, payload);
          if (response.status === 200 || response.status === 201) {
            queue.markMerchandisingSynced(item.localId);
            results.synced += 1;
          } else {
            queue.markMerchandisingFailed(item.localId, `HTTP ${response.status}`);
            results.failed += 1;
          }
        } catch (error) {
          queue.markMerchandisingFailed(item.localId, error.message || String(error));
          results.failed += 1;
          results.errors.push({ localId: item.localId, error: error.message || String(error) });
        }
      }
    } finally {
      syncing = false;
    }
    return results;
  }

  function start() {
    const triggerSync = () => {
      syncPendingRecords().catch((error) => {
        console.error('Merchandising sync failed to check network or queue state:', error);
      });
    };
    const unsubscribe = subscribeToConnectivity((online) => {
      if (online) triggerSync();
    });
    const interval = setInterval(triggerSync, 30 * 1000);
    Promise.resolve().then(isOnline).then((online) => {
      if (online) triggerSync();
    }).catch((error) => {
      console.error('Merchandising sync failed to check network state:', error);
    });
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }

  return { syncPendingRecords, isSyncing: () => syncing, start };
}
