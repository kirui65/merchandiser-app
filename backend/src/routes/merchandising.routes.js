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

router.use(requireAuth, requireRepOrManager);

function requireRep(req, res, next) {
  if (req.user.role !== 'rep') return next(new ApiError(403, 'Merchandiser role required'));
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

router.get('/audits', listMerchandisingAudits);
router.post('/audits', requireRep, setRequestId, validateBody(MerchandisingAuditCreateSchema), createMerchandisingAudit);
router.patch('/audits/:id', validateBody(MerchandisingAuditUpdateSchema), updateMerchandisingAudit);
router.delete('/audits/:id', deleteMerchandisingAudit);
router.get('/competitor-prices', listCompetitorPrices);
router.post('/competitor-prices', requireRep, setRequestId, validateBody(CompetitorPriceCreateSchema), createCompetitorPrice);
router.patch('/competitor-prices/:id', validateBody(CompetitorPriceUpdateSchema), updateCompetitorPrice);
router.delete('/competitor-prices/:id', deleteCompetitorPrice);
router.get('/outlet-onboarding', listOutletOnboarding);
router.post('/outlet-onboarding', requireRep, setRequestId, validateBody(OutletOnboardingCreateSchema), createOutletOnboarding);
router.get('/outlet-onboarding/:id/photo-url', getOutletOnboardingPhotoUrl);
router.patch('/outlet-onboarding/:id/review', requireManager, validateBody(z.object({
  status: z.enum(['approved', 'rejected']),
})), reviewOutletOnboarding);

module.exports = router;
