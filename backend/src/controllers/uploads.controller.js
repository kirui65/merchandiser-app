const { randomUUID } = require('crypto');
const { getStorageBucket } = require('../config/firebase');
const { ApiError } = require('../middleware/errorHandler');

const ALLOWED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const SIGNED_URL_LIFETIME_MS = 10 * 60 * 1000;

/**
 * Creates a short-lived, write-only URL for a receipt image. The object name
 * is constructed server-side from the authenticated rep ID, so a client can
 * never obtain a URL for another rep's storage namespace.
 */
async function createSalePhotoUploadUrl(req, res, next) {
  try {
    const contentType = req.body?.contentType;
    const extension = ALLOWED_CONTENT_TYPES[contentType];
    if (!extension) {
      throw new ApiError(400, 'Receipt photo must be a JPEG, PNG, or WebP image');
    }

    const bucket = getStorageBucket();
    const objectPath = `sales/${req.user.uid}/${randomUUID()}.${extension}`;
    const file = bucket.file(objectPath);
    const expiresAt = Date.now() + SIGNED_URL_LIFETIME_MS;
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType,
    });

    return res.status(201).json({
      uploadUrl,
      // Persist the canonical Storage URI rather than a temporary signed URL.
      photoUrl: `gs://${bucket.name}/${objectPath}`,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createSalePhotoUploadUrl };
