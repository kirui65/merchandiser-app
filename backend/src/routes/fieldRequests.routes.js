const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { FieldRequestCreateSchema, FieldRequestReviewSchema } = require('../models/fieldRequest.model');
const { ApiError } = require('../middleware/errorHandler');
const {
  listFieldRequests,
  deleteFieldRequest,
  createFieldRequest,
  reviewFieldRequest,
} = require('../controllers/teamLeader.controller');

const FIELD_ROLES = ['rep', 'brand_ambassador', 'telemarketer', 'team_leader'];
const router = express.Router();
router.use(requireAuth);

router.get('/', listFieldRequests);
router.delete('/:id', deleteFieldRequest);
router.post('/', (req, res, next) => {
  if (!FIELD_ROLES.includes(req.user.role)) return next(new ApiError(403, 'Field role required'));
  return validateBody(FieldRequestCreateSchema)(req, res, next);
}, createFieldRequest);
router.patch('/:id/review', (req, res, next) => {
  if (!['team_leader', 'manager'].includes(req.user.role)) {
    return next(new ApiError(403, 'Team leader role required'));
  }
  return validateBody(FieldRequestReviewSchema)(req, res, next);
}, reviewFieldRequest);

module.exports = router;
