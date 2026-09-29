const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { listDocs } = require('../services/firestore.service');
const { recordAudit } = require('../services/audit.service');
const { ApiError } = require('../middleware/errorHandler');

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

router.post('/events', async (req, res, next) => {
  try {
    if (req.body?.event !== 'dashboard_export' || !['csv', 'print'].includes(req.body?.format)) throw new ApiError(400, 'A valid dashboard export event is required');
    await recordAudit(req, { action: 'exported', entityType: 'dashboard', entity: { id: 'dashboard', name: 'Sales dashboard' }, changedFields: [req.body.format, ...(req.body.range ? ['date_range'] : [])] });
    return res.status(201).json({ recorded: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
