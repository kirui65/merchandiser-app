const BATCH_SIZE = 20;

async function prepareActivation(payload, uploadMedia) {
  const media = [];
  for (const item of payload.media) {
    media.push(item.storageUri.startsWith('file://')
      ? { ...item, storageUri: await uploadMedia(item.storageUri, item.mediaId) }
      : item);
  }

  const expenses = [];
  for (const expense of payload.expenses) {
    const { receiptMediaId, ...storedExpense } = expense;
    expenses.push(expense.receiptStorageUri?.startsWith('file://')
      ? { ...storedExpense, receiptStorageUri: await uploadMedia(expense.receiptStorageUri, receiptMediaId) }
      : storedExpense);
  }

  return { ...payload, media, expenses };
}

export function createActivationSyncManager({ queue, api, uploadMedia, isOnline, subscribeToConnectivity }) {
  let syncing = false;

  async function syncPendingActivations() {
    if (syncing || !(await isOnline())) return { skipped: true };
    syncing = true;
    const results = { synced: 0, failed: 0, errors: [] };
    try {
      const pending = queue.getPendingActivations().slice(0, BATCH_SIZE);
      for (const item of pending) {
        try {
          const payload = await prepareActivation(item.payload, uploadMedia);
          const response = item.remoteExists
            ? await api.updateActivation(item.localId, payload)
            : await api.createActivation(item.localId, payload);
          if (response.status === 200 || response.status === 201) {
            queue.markActivationSynced(item.localId, item.revision);
            results.synced += 1;
          } else {
            queue.markActivationFailed(item.localId, `HTTP ${response.status}`, item.revision);
            results.failed += 1;
          }
        } catch (error) {
          queue.markActivationFailed(item.localId, error.message || String(error), item.revision);
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
      syncPendingActivations().catch((error) => {
        console.error('Activation sync could not check the network state:', error);
      });
    };
    const unsubscribe = subscribeToConnectivity((online) => {
      if (online) triggerSync();
    });
    const interval = setInterval(triggerSync, 30 * 1000);
    Promise.resolve()
      .then(isOnline)
      .then((online) => {
        if (online) triggerSync();
      })
      .catch((error) => {
        console.error('Activation sync could not check the network state:', error);
      });
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }

  return { syncPendingActivations, isSyncing: () => syncing, start };
}
