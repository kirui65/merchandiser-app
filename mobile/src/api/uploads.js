import axios from 'axios';
import client from './client';

async function requestSalePhotoUploadUrl(contentType) {
  const { data } = await client.post('/uploads/sale-photo', { contentType });
  return data;
}

/** Uploads a local Expo camera URI directly to the rep-scoped signed URL. */
export async function uploadSalePhoto(uri, onProgress) {
  const localPhoto = await fetch(uri);
  if (!localPhoto.ok) throw new Error('Unable to read the captured receipt photo');

  const body = await localPhoto.blob();
  const contentType = body.type || 'image/jpeg';
  const { uploadUrl, photoUrl } = await requestSalePhotoUploadUrl(contentType);

  await axios.put(uploadUrl, body, {
    headers: { 'Content-Type': contentType },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });

  return photoUrl;
}
