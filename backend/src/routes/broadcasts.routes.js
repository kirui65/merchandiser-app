const express = require('express');
const { z } = require('zod');
const { requireAuth, requireTeamLeader } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { BroadcastCreateSchema, BroadcastUpdateSchema } = require('../models/broadcast.model');
const { ApiError } = require('../middleware/errorHandler');
const {
  listBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
} = require('../controllers/teamLeader.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', listBroadcasts);
router.post('/', requireTeamLeader, validateBody(BroadcastCreateSchema), createBroadcast);
router.patch('/:id', validateBody(BroadcastUpdateSchema), updateBroadcast);
router.delete('/:id', (req, res, next) => {
  if (!['manager', 'team_leader'].includes(req.user.role)) {
    return next(new ApiError(403, 'Team leader role required'));
  }
  return deleteBroadcast(req, res, next);
});

module.exports = router;
