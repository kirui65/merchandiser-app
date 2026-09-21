const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { createSalePhotoUploadUrl } = require('../controllers/uploads.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/sale-photo', createSalePhotoUploadUrl);

module.exports = router;
