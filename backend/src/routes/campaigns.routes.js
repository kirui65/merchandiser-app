const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { CampaignCreateSchema, CampaignUpdateSchema } = require('../models/campaign.model');
const campaigns = require('../controllers/campaigns.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/available', campaigns.listAvailableCampaigns);
router.use(requireManager);
router.get('/', campaigns.listCampaigns);
router.post('/', validateBody(CampaignCreateSchema), campaigns.createCampaign);
router.patch('/:id', validateBody(CampaignUpdateSchema), campaigns.updateCampaign);
router.delete('/:id', campaigns.archiveCampaign);

module.exports = router;
