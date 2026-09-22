const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { PingBatchSchema } = require('../models/route.model');
const { getRoute, getRouteHistory, appendPings, setPlannedOutlets } = require('../controllers/routes.controller');

const router = express.Router();
router.use(requireAuth);
router.get('/', getRoute);
router.get('/history', getRouteHistory);
router.post('/pings', validateBody(PingBatchSchema), appendPings);
router.put('/plan', requireManager, setPlannedOutlets);

module.exports = router;
