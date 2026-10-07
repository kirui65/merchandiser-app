const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { ApiError } = require('../middleware/errorHandler');
const {
  ActivationCreateSchema,
  ActivationUpdateSchema,
} = require('../models/activation.model');
const {
  createActivation,
  listActivations,
  updateActivation,
} = require('../controllers/activations.controller');

const router = express.Router();
const idempotencyKeySchema = z.string().uuid();

router.use(requireAuth);

function requireAmbassadorOrManager(req, res, next) {
  if (!['brand_ambassador', 'manager', 'team_leader'].includes(req.user.role)) {
    return next(new ApiError(403, 'Brand ambassador or manager role required'));
  }
  return next();
}

function requireAmbassador(req, res, next) {
  if (req.user.role !== 'brand_ambassador') return next(new ApiError(403, 'Brand ambassador role required'));
  return next();
}

function validateIdempotencyKey(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (key) {
    const parsed = idempotencyKeySchema.safeParse(key);
    if (!parsed.success) return next(new ApiError(400, 'Invalid Idempotency-Key'));
    req.activationRequestId = parsed.data;
  }
  return next();
}

router.use(requireAmbassadorOrManager);
router.get('/', listActivations);
router.post('/', requireAmbassador, validateIdempotencyKey, validateBody(ActivationCreateSchema), createActivation);
router.patch('/:id', validateBody(ActivationUpdateSchema), updateActivation);

module.exports = router;
