const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { LeadCreateSchema, LeadUpdateSchema } = require('../models/lead.model');
const {
  createLead,
  listLeads,
  getLead,
  updateLead,
} = require('../controllers/leads.controller');
const { ApiError } = require('../middleware/errorHandler');

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

router.use(requireTelemarketerOrManager);
router.get('/', listLeads);
router.post('/', requireTelemarketer, validateBody(LeadCreateSchema), createLead);
router.get('/:id', getLead);
router.patch('/:id', requireTelemarketer, validateBody(LeadUpdateSchema), updateLead);

module.exports = router;
