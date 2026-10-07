import assert from 'node:assert/strict';
import test from 'node:test';
import { createActivationSyncManager } from '../src/offline/activationSyncManager.js';

test('uploads evidence before creating an activation and marks the same queue revision synced', async () => {
  const calls = [];
  const queue = {
    getPendingActivations: () => [{
      localId: 'activation-id',
      revision: 3,
      remoteExists: false,
      payload: {
        status: 'submitted',
        media: [{
          mediaId: 'photo-id',
          storageUri: 'file:///activation.jpg',
          mediaType: 'photo',
          contentType: 'image/jpeg',
          capturedAt: '2026-10-07T10:00:00.000Z',
        }],
        expenses: [],
      },
    }],
    markActivationSynced: (...args) => calls.push(['synced', ...args]),
    markActivationFailed: (...args) => calls.push(['failed', ...args]),
  };
  const manager = createActivationSyncManager({
    queue,
    api: {
      createActivation: async (id, payload) => {
        calls.push(['create', id, payload.media[0].storageUri]);
        return { status: 201 };
      },
      updateActivation: async () => { throw new Error('Unexpected update'); },
    },
    uploadMedia: async (uri, id) => {
      calls.push(['upload', uri, id]);
      return 'gs://bucket/activations/ambassador/photo-id.jpg';
    },
    isOnline: async () => true,
    subscribeToConnectivity: () => () => {},
  });

  const result = await manager.syncPendingActivations();
  assert.deepEqual(result, { synced: 1, failed: 0, errors: [] });
  assert.deepEqual(calls, [
    ['upload', 'file:///activation.jpg', 'photo-id'],
    ['create', 'activation-id', 'gs://bucket/activations/ambassador/photo-id.jpg'],
    ['synced', 'activation-id', 3],
  ]);
});

test('keeps activation retryable when evidence upload fails', async () => {
  const calls = [];
  const manager = createActivationSyncManager({
    queue: {
      getPendingActivations: () => [{
        localId: 'activation-id',
        revision: 1,
        remoteExists: false,
        payload: {
          media: [{
            mediaId: 'photo-id',
            storageUri: 'file:///activation.jpg',
          }],
          expenses: [],
        },
      }],
      markActivationSynced: () => calls.push('synced'),
      markActivationFailed: (...args) => calls.push(['failed', ...args]),
    },
    api: {
      createActivation: async () => { throw new Error('Should not create until upload succeeds'); },
      updateActivation: async () => { throw new Error('Unexpected update'); },
    },
    uploadMedia: async () => { throw new Error('Offline upload failed'); },
    isOnline: async () => true,
    subscribeToConnectivity: () => () => {},
  });

  const result = await manager.syncPendingActivations();
  assert.equal(result.failed, 1);
  assert.equal(calls[0][0], 'failed');
  assert.equal(calls[0][1], 'activation-id');
  assert.equal(calls[0][2], 'Offline upload failed');
  assert.equal(calls.some((call) => call === 'synced'), false);
});
