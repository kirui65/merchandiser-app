import axios from 'axios';
import client from './client';
import { createLocalId } from '../utils/ids';

const paths = {
  audit: '/merchandising/audits',
  competitorPrice: '/merchandising/competitor-prices',
  outletOnboarding: '/merchandising/outlet-onboarding',
};

export async function fetchMerchandisingAudits(filters = {}) {
  const { data } = await client.get(paths.audit, { params: filters });
  return data.audits;
}

export async function fetchOutletOnboarding(filters = {}) {
  const { data } = await client.get(paths.outletOnboarding, { params: filters });
  return data.onboarding;
}

export async function createMerchandisingRecord(recordType, localId, payload) {
  const response = await client.post(paths[recordType], payload, {
    headers: { 'Idempotency-Key': localId },
  });
  return { status: response.status, data: response.data };
}

export async function uploadMerchandisingPhoto(uri, stableId) {
  const localPhoto = await fetch(uri);
  if (!localPhoto.ok) throw new Error('Unable to read the captured merchandising photo');
  const body = await localPhoto.blob();
  const contentType = body.type || 'image/jpeg';
  const { data } = await client.post('/uploads/merchandising-photo', {
    contentType,
    mediaId: stableId || createLocalId(),
  });
  await axios.put(data.uploadUrl, body, { headers: { 'Content-Type': contentType } });
  return data.storageUri;
}
