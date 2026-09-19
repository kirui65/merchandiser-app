const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { getTotals } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(requireAuth, requireManager);
router.get('/totals', getTotals);

module.exports = router;
