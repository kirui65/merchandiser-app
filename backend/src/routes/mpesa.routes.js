// STK push + Daraja callback webhook — Phase 3.
const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// NOTE: the Daraja callback itself must NOT go through requireAuth (Safaricom
// calls it directly, with no JWT) — when built in Phase 3, mount that one
// route before router.use(requireAuth) below, and verify it instead via
// Daraja's own callback validation.
router.use(requireAuth);

router.all('*', (req, res) => {
  res.status(501).json({ error: { message: 'M-Pesa reconciliation endpoints ship in Phase 3' } });
});

module.exports = router;
