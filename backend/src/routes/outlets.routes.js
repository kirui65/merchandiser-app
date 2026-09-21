const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { OutletSchema, OutletUpdateSchema, OutletStatusSchema } = require('../models/outlet.model');
const { createDoc, listDocs, getDoc, updateDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/audit.service');

const router = express.Router();

router.use(requireAuth);

// All authenticated users can read outlets (reps need this to log sales
// against them); only managers can create/edit.
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    // A rep by default only needs their assigned outlets; managers can see all
    // or filter by ?repId=
    if (req.user.role !== 'manager') {
      where.push(['assignedRepId', '==', req.user.uid]);
    } else if (req.query.repId) {
      where.push(['assignedRepId', '==', req.query.repId]);
    }
    const outlets = await listDocs('outlets', { where });
    return res.json({ outlets });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const outlet = await getDoc('outlets', req.params.id);
    if (!outlet) throw new ApiError(404, 'Outlet not found');
    return res.json({ outlet });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireManager, validateBody(OutletSchema), async (req, res, next) => {
  try {
    const outlet = await createDoc('outlets', req.body);
    await recordAudit(req, { action: 'created', entityType: 'outlet', entity: outlet, changedFields: Object.keys(req.body) });
    return res.status(201).json({ outlet });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireManager, validateBody(OutletUpdateSchema), async (req, res, next) => {
  try {
    const existing = await getDoc('outlets', req.params.id);
    if (!existing) throw new ApiError(404, 'Outlet not found');
    const outlet = await updateDoc('outlets', req.params.id, req.body);
    await recordAudit(req, { action: 'edited', entityType: 'outlet', entity: outlet, changedFields: Object.keys(req.body) });
    return res.json({ outlet });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/status', requireManager, validateBody(OutletStatusSchema), async (req, res, next) => {
  try {
    const existing = await getDoc('outlets', req.params.id);
    if (!existing) throw new ApiError(404, 'Outlet not found');
    const outlet = await updateDoc('outlets', req.params.id, req.body);
    await recordAudit(req, { action: outlet.active ? 'reactivated' : 'deactivated', entityType: 'outlet', entity: outlet, changedFields: ['active'] });
    return res.json({ outlet });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
