const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { CallCreateSchema } = require('../models/call.model');
const { listCalls, createCall } = require('../controllers/leads.controller');
const { ApiError } = require('../middleware/errorHandler');
const { z } = require('zod');

const CallRequestIdSchema = z.string().uuid();

const router = express.Router();

router.use(requireAuth);

function requireTelemarketerOrManager(req, res, next) {
  if (!['telemarketer', 'manager'].includes(req.user.role)) {
    return next(new ApiError(403, 'Telemarketer or manager role required'));
  }
  return next();
}

function requireTelemarketer(req, res, next) {
  if (req.user.role !== 'telemarketer') return next(new ApiError(403, 'Telemarketer role required'));
  return next();
}

function validateIdempotencyKey(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (key) {
    const result = CallRequestIdSchema.safeParse(key);
    if (!result.success) return next(new ApiError(400, 'Invalid Idempotency-Key'));
    req.callRequestId = result.data;
  }
  return next();
}

router.use(requireTelemarketerOrManager);
router.get('/', listCalls);
router.post('/:leadId', requireTelemarketer, validateIdempotencyKey, validateBody(CallCreateSchema), createCall);

module.exports = router;
