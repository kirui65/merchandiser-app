const express = require('express');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { TeamCreateSchema, TeamUpdateSchema } = require('../models/team.model');
const { RegionCreateSchema, RegionUpdateSchema } = require('../models/region.model');
const { TeamMembershipCreateSchema, TeamMembershipUpdateSchema } = require('../models/teamMembership.model');
const teams = require('../controllers/teams.controller');

const router = express.Router();
router.use(requireAuth, requireManager);

router.get('/', teams.listTeams);
router.post('/', validateBody(TeamCreateSchema), teams.createTeam);
router.patch('/:id', validateBody(TeamUpdateSchema), teams.updateTeam);
router.delete('/:id', teams.deactivateTeam);

router.get('/regions', teams.listRegions);
router.post('/regions', validateBody(RegionCreateSchema), teams.createRegion);
router.patch('/regions/:id', validateBody(RegionUpdateSchema), teams.updateRegion);
router.delete('/regions/:id', teams.deactivateRegion);

router.get('/memberships', teams.listMemberships);
router.post('/memberships', validateBody(TeamMembershipCreateSchema), teams.createMembership);
router.patch('/memberships/:id', validateBody(TeamMembershipUpdateSchema), teams.updateMembership);

module.exports = router;
