const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { listDocs } = require('../services/firestore.service');

const router = express.Router();

router.use(requireAuth, requireManager);

router.get('/', async (req, res, next) => {
  try {
    const entries = await listDocs('auditLog', {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: 500,
    });
    return res.json({ entries });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
