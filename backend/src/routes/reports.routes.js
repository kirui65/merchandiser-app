const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { getCompanyReport } = require('../controllers/campaigns.controller');

const router = express.Router();
router.use(requireAuth, requireManager);
router.get('/company', getCompanyReport);

module.exports = router;
