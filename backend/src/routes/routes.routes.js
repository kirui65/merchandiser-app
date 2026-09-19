// GPS ping ingestion + route replay — Phase 2.
// Kept as a minimal router (not just a comment) so index.js can mount it
// safely today without every Phase-2 endpoint 404ing through the generic
// notFoundHandler with no context.
const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.all('*', (req, res) => {
  res.status(501).json({ error: { message: 'Route/GPS tracking endpoints ship in Phase 2' } });
});

module.exports = router;
