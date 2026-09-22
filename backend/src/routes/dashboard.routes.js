const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { getTotals, getOverdueOutlets } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/totals', getTotals);
router.get('/overdue-outlets', requireManager, getOverdueOutlets);

module.exports = router;
