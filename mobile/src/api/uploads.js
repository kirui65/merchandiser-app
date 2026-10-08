import axios from 'axios';
import client from './client';
import { uploadErrorMessage } from './uploadErrors';

async function requestSalePhotoUploadUrl(contentType) {
  const { data } = await client.post('/uploads/sale-photo', { contentType });
  return data;
}

/** Uploads a local Expo camera URI directly to the rep-scoped signed URL. */
export async function uploadSalePhoto(uri, onProgress) {
  let localPhoto;
  try {
    localPhoto = await fetch(uri);
  } catch {
    throw new Error('Could not read the captured receipt photo from this device. Retake it and retry.');
  }
  if (!localPhoto.ok) throw new Error('Could not read the captured receipt photo from this device. Retake it and retry.');

  let body;
  try {
    body = await localPhoto.blob();
  } catch {
    throw new Error('Could not prepare the captured receipt photo for upload. Retake it and retry.');
  }
  const contentType = body.type || 'image/jpeg';
  let upload;
  try {
    upload = await requestSalePhotoUploadUrl(contentType);
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'receipt photo', 'server'));
  }

  try {
    await axios.put(upload.uploadUrl, body, {
      headers: { 'Content-Type': contentType },
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
  } catch (error) {
    throw new Error(uploadErrorMessage(error, 'receipt photo', 'storage'));
  }

  return upload.photoUrl;
}
