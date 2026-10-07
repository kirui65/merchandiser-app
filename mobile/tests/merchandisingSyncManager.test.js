import assert from 'node:assert/strict';
import test from 'node:test';
import { createMerchandisingSyncManager } from '../src/offline/merchandisingSyncManager.js';

test('uploads offline photos with stable identifiers before syncing merchandising records', async () => {
  const calls = [];
  const manager = createMerchandisingSyncManager({
    queue: {
      getPendingMerchandisingRecords: () => [{
        localId: '11111111-1111-4111-8111-111111111111',
        recordType: 'audit',
        payload: { photoStorageUris: ['file:///shelf.jpg'] },
      }],
      markMerchandisingSynced: (id) => calls.push(['synced', id]),
      markMerchandisingFailed: (...args) => calls.push(['failed', ...args]),
    },
    api: {
      createRecord: async (type, id, payload) => {
        calls.push(['create', type, id, payload.photoStorageUris]);
        return { status: 201 };
      },
    },
    uploadPhoto: async (uri, mediaId) => {
      calls.push(['upload', uri, mediaId]);
      return 'gs://bucket/merchandising/user/photo.jpg';
    },
    isOnline: async () => true,
    subscribeToConnectivity: () => () => {},
  });

  const result = await manager.syncPendingRecords();
  assert.deepEqual(result, { synced: 1, failed: 0, errors: [] });
  assert.deepEqual(calls, [
    ['upload', 'file:///shelf.jpg', '11111111-1111-4111-8111-000000000000'],
    ['create', 'audit', '11111111-1111-4111-8111-111111111111', ['gs://bucket/merchandising/user/photo.jpg']],
    ['synced', '11111111-1111-4111-8111-111111111111'],
  ]);
});

test('keeps a record retryable when photo upload fails', async () => {
  const calls = [];
  const manager = createMerchandisingSyncManager({
    queue: {
      getPendingMerchandisingRecords: () => [{
        localId: '22222222-2222-4222-8222-222222222222',
        recordType: 'outletOnboarding',
        payload: { photoStorageUri: 'file:///outlet.jpg' },
      }],
      markMerchandisingSynced: () => calls.push('synced'),
      markMerchandisingFailed: (...args) => calls.push(['failed', ...args]),
    },
    api: { createRecord: async () => { throw new Error('Must not create before photo upload'); } },
    uploadPhoto: async (_uri, mediaId) => {
      assert.match(mediaId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      throw new Error('Upload unavailable');
    },
    isOnline: async () => true,
    subscribeToConnectivity: () => () => {},
  });

  const result = await manager.syncPendingRecords();
  assert.equal(result.failed, 1);
  assert.equal(calls.some((call) => call === 'synced'), false);
  assert.deepEqual(calls[0], ['failed', '22222222-2222-4222-8222-222222222222', 'Upload unavailable']);
});
