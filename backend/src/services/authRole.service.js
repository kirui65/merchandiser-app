const { ApiError } = require('../middleware/errorHandler');

const PICKED_ROLE_ALIASES = Object.freeze({
  merchandiser: 'rep',
  admin: 'manager',
});

const PICKED_ROLES = new Set([
  'rep',
  'manager',
  'brand_ambassador',
  'telemarketer',
  'team_leader',
  ...Object.keys(PICKED_ROLE_ALIASES),
]);

function assertPickedRoleMatches(accountRole, pickedRole) {
  if (pickedRole === undefined) return;
  if (typeof pickedRole !== 'string' || !PICKED_ROLES.has(pickedRole)) {
    throw new ApiError(400, 'Invalid role selection');
  }

  const expectedRole = PICKED_ROLE_ALIASES[pickedRole] || pickedRole;
  if (accountRole !== expectedRole) {
    throw new ApiError(403, `This account is not registered as ${pickedRole}`);
  }
}

module.exports = { assertPickedRoleMatches };
