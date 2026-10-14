const express = require('express');
const { validateBody } = require('../middleware/validate.middleware');
const { WebReferralCreateSchema } = require('../models/referralRegistration.model');
const { webLeadRateLimit } = require('../middleware/webLeadRateLimit.middleware');
const controller = require('../controllers/publicReferrals.controller');

const router = express.Router();

router.get('/campaigns/:slug', controller.getPublicCampaign);
// Honeypots are handled ahead of rate limiting and validation so bots get a
// successful-looking response without learning which checks they triggered.
router.post('/referrals', controller.discardHoneypot, webLeadRateLimit, validateBody(WebReferralCreateSchema), controller.createWebReferral);

module.exports = router;
