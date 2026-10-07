const express = require('express');
const { z } = require('zod');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { ApiError } = require('../middleware/errorHandler');
const { MerchandisingAuditCreateSchema, MerchandisingAuditUpdateSchema } = require('../models/merchandisingAudit.model');
const { CompetitorPriceCreateSchema, CompetitorPriceUpdateSchema } = require('../models/competitorPrice.model');
const { OutletOnboardingCreateSchema } = require('../models/outletOnboarding.model');
const {
  requireRepOrManager,
  createMerchandisingAudit,
  listMerchandisingAudits,
  updateMerchandisingAudit,
  deleteMerchandisingAudit,
  createCompetitorPrice,
  listCompetitorPrices,
  updateCompetitorPrice,
  deleteCompetitorPrice,
  createOutletOnboarding,
  listOutletOnboarding,
  getOutletOnboardingPhotoUrl,
  reviewOutletOnboarding,
} = require('../controllers/merchandising.controller');

const router = express.Router();
const RequestIdSchema = z.string().uuid();

router.use(requireAuth);

function requireRep(req, res, next) {
  if (req.user.role !== 'rep') return next(new ApiError(403, 'Merchandiser role required'));
  return next();
}

function requireMerchandiserOrManager(req, res, next) {
  if (!['rep', 'manager'].includes(req.user.role)) {
    return next(new ApiError(403, 'Team leaders have read-only access to field records'));
  }
  return next();
}

function setRequestId(req, res, next) {
  const requestId = req.get('Idempotency-Key');
  if (requestId) {
    const parsed = RequestIdSchema.safeParse(requestId);
    if (!parsed.success) return next(new ApiError(400, 'Invalid Idempotency-Key'));
    req.recordId = parsed.data;
  }
  return next();
}

router.get('/audits', requireRepOrManager, listMerchandisingAudits);
router.post('/audits', requireRep, setRequestId, validateBody(MerchandisingAuditCreateSchema), createMerchandisingAudit);
router.patch('/audits/:id', requireMerchandiserOrManager, validateBody(MerchandisingAuditUpdateSchema), updateMerchandisingAudit);
router.delete('/audits/:id', requireMerchandiserOrManager, deleteMerchandisingAudit);
router.get('/competitor-prices', requireRepOrManager, listCompetitorPrices);
router.post('/competitor-prices', requireRep, setRequestId, validateBody(CompetitorPriceCreateSchema), createCompetitorPrice);
router.patch('/competitor-prices/:id', requireMerchandiserOrManager, validateBody(CompetitorPriceUpdateSchema), updateCompetitorPrice);
router.delete('/competitor-prices/:id', requireMerchandiserOrManager, deleteCompetitorPrice);
router.get('/outlet-onboarding', requireRepOrManager, listOutletOnboarding);
router.post('/outlet-onboarding', requireRep, setRequestId, validateBody(OutletOnboardingCreateSchema), createOutletOnboarding);
router.get('/outlet-onboarding/:id/photo-url', getOutletOnboardingPhotoUrl);
router.patch('/outlet-onboarding/:id/review', requireManager, validateBody(z.object({
  status: z.enum(['approved', 'rejected']),
})), reviewOutletOnboarding);

module.exports = router;
