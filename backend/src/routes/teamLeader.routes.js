const express = require('express');
const { requireAuth, requireTeamLeader } = require('../middleware/auth.middleware');
const teamLeader = require('../controllers/teamLeader.controller');

const router = express.Router();
router.use(requireAuth, requireTeamLeader);
router.get('/overview', teamLeader.getOverview);
router.get('/locations', teamLeader.getTeamLocations);

module.exports = router;
