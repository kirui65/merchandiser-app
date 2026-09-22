const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { TerritorySchema } = require('../models/territory.model');
const { createDoc, getDoc, listDocs, updateDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/audit.service');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const territories = await listDocs('territories', { orderBy: { field: 'name' } });
    return res.json({ territories });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireManager, validateBody(TerritorySchema), async (req, res, next) => {
  try {
    const territory = await createDoc('territories', req.body);
    await recordAudit(req, { action: 'created', entityType: 'territory', entity: territory, changedFields: Object.keys(req.body) });
    return res.status(201).json({ territory });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireManager, validateBody(TerritorySchema), async (req, res, next) => {
  try {
    const existing = await getDoc('territories', req.params.id);
    if (!existing) throw new ApiError(404, 'Territory not found');
    const territory = await updateDoc('territories', req.params.id, req.body);
    await recordAudit(req, { action: 'edited', entityType: 'territory', entity: territory, changedFields: Object.keys(req.body) });
    return res.json({ territory });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
