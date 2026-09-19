const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { RepCreateSchema } = require('../models/rep.model');
const { createDoc, listDocs, getDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');

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
