const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  createSalePhotoUploadUrl,
  createActivationMediaUploadUrl,
  createMerchandisingMediaUploadUrl,
} = require('../controllers/uploads.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/sale-photo', createSalePhotoUploadUrl);
router.post('/activation-media', createActivationMediaUploadUrl);
router.post('/merchandising-photo', createMerchandisingMediaUploadUrl);

module.exports = router;
