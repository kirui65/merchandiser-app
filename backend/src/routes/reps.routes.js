const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { RepCreateSchema, RepUpdateSchema } = require('../models/rep.model');
const { createDoc, listDocs, getDoc, updateDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/audit.service');

const router = express.Router();

router.use(requireAuth);

// Only managers can create/list reps — this is the rep roster, not sales data.
router.post('/', requireManager, validateBody(RepCreateSchema), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const rep = await createDoc('reps', {
      ...rest,
      passwordHash,
      active: true,
    });
    await recordAudit(req, { action: 'created', entityType: 'rep', entity: rep, changedFields: Object.keys(rest) });

    const { passwordHash: _omit, ...safeRep } = rep;
    return res.status(201).json({ rep: safeRep });
  } catch (err) {
    return next(err);
  }
});

router.get('/', requireManager, async (req, res, next) => {
  try {
    const reps = await listDocs('reps');
    const safeReps = reps.map(({ passwordHash, ...r }) => r);
    return res.json({ reps: safeReps });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireManager, validateBody(RepUpdateSchema), async (req, res, next) => {
  try {
    const existing = await getDoc('reps', req.params.id);
    if (!existing) throw new ApiError(404, 'Rep not found');
    const rep = await updateDoc('reps', req.params.id, req.body);
    await recordAudit(req, { action: 'edited', entityType: 'rep', entity: rep, changedFields: Object.keys(req.body) });
    const { passwordHash: _omit, ...safeRep } = rep;
    return res.json({ rep: safeRep });
  } catch (err) { return next(err); }
});

router.patch('/:id/status', requireManager, async (req, res, next) => {
  try {
    const existing = await getDoc('reps', req.params.id);
    if (!existing) throw new ApiError(404, 'Rep not found');
    const rep = await updateDoc('reps', req.params.id, { active: req.body.active === true });
    await recordAudit(req, { action: rep.active ? 'reactivated' : 'deactivated', entityType: 'rep', entity: rep, changedFields: ['active'] });
    const { passwordHash: _omit, ...safeRep } = rep;
    return res.json({ rep: safeRep });
  } catch (err) { return next(err); }
});

router.post('/:id/reset-password', requireManager, async (req, res, next) => {
  try {
    const existing = await getDoc('reps', req.params.id);
    if (!existing) throw new ApiError(404, 'Rep not found');
    const temporaryPassword = `Bs-${require('crypto').randomBytes(5).toString('base64url')}`;
    const rep = await updateDoc('reps', req.params.id, { passwordHash: await bcrypt.hash(temporaryPassword, 10) });
    await recordAudit(req, { action: 'password_reset', entityType: 'rep', entity: rep, changedFields: ['password'] });
    return res.json({ temporaryPassword });
  } catch (err) { return next(err); }
});

// A rep can fetch their own profile; managers can fetch any.
router.get('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'manager' && req.user.uid !== req.params.id) {
      throw new ApiError(403, 'Not authorized to view this rep');
    }
    const rep = await getDoc('reps', req.params.id);
    if (!rep) throw new ApiError(404, 'Rep not found');
    const { passwordHash, ...safeRep } = rep;
    return res.json({ rep: safeRep });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
