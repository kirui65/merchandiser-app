import axios from 'axios';
import client from './client';
import { createLocalId } from '../utils/ids';
import { uploadErrorMessage } from './uploadErrors';

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
  let localPhoto;
  try {
    localPhoto = await fetch(uri);
  } catch {
    throw new Error('Could not read the captured merchandising photo from this device. Retake it and retry.');
  }
  if (!localPhoto.ok) throw new Error('Could not read the captured merchandising photo from this device. Retake it and retry.');
  let body;
  try {
    body = await localPhoto.blob();
  } catch {
    throw new Error('Could not prepare the captured merchandising photo for upload. Retake it and retry.');
  }
  const contentType = body.type || 'image/jpeg';
  let upload;
  try {
    const { data } = await client.post('/uploads/merchandising-photo', {
      contentType,
      mediaId: stableId || createLocalId(),
    });
    upload = data;
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'merchandising photo', 'server'));
  }
  try {
    await axios.put(upload.uploadUrl, body, { headers: { 'Content-Type': contentType } });
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'merchandising photo', 'storage'));
  }
  return upload.storageUri;
}
