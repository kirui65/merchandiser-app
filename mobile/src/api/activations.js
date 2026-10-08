import axios from 'axios';
import client from './client';
import { uploadErrorMessage } from './uploadErrors';

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
  let localMedia;
  try {
    localMedia = await fetch(uri);
  } catch {
    throw new Error('Could not read the captured activation photo from this device. Retake it and retry.');
  }
  if (!localMedia.ok) throw new Error('Could not read the captured activation photo from this device. Retake it and retry.');
  let body;
  try {
    body = await localMedia.blob();
  } catch {
    throw new Error('Could not prepare the captured activation photo for upload. Retake it and retry.');
  }
  const contentType = body.type || 'image/jpeg';
  let upload;
  try {
    const { data } = await client.post('/uploads/activation-media', { contentType, mediaId });
    upload = data;
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'activation photo', 'server'));
  }
  try {
    await axios.put(upload.uploadUrl, body, { headers: { 'Content-Type': contentType } });
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'activation photo', 'storage'));
  }
  return upload.storageUri;
}
