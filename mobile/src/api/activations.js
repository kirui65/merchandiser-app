import axios from 'axios';
import client from './client';

export async function fetchActivations(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const { data } = await client.get('/activations', { params });
  return data.activations;
}

export async function createActivation(localId, activation) {
  const response = await client.post('/activations', activation, {
    headers: { 'Idempotency-Key': localId },
  });
  return { status: response.status, data: response.data };
}

export async function updateActivation(id, activation) {
  const response = await client.patch(`/activations/${id}`, activation);
  return { status: response.status, data: response.data };
}

export async function uploadActivationMedia(uri, mediaId) {
  const localMedia = await fetch(uri);
  if (!localMedia.ok) throw new Error('Unable to read the captured activation photo');
  const body = await localMedia.blob();
  const contentType = body.type || 'image/jpeg';
  const { data } = await client.post('/uploads/activation-media', { contentType, mediaId });
  await axios.put(data.uploadUrl, body, { headers: { 'Content-Type': contentType } });
  return data.storageUri;
}
