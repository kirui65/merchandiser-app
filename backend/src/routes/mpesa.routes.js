const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireManager } = require('../middleware/auth.middleware');
const { initiatePayment, callback, getReconciliation } = require('../controllers/mpesa.controller');

const router = express.Router();

router.post('/callback', callback);
router.use(requireAuth);
router.post('/stk-push', initiatePayment);
router.get('/reconciliation', requireManager, getReconciliation);

module.exports = router;
