const { ApiError } = require('../middleware/errorHandler');

const RESET_DELETE_COLLECTIONS = Object.freeze([
  'activations', 'broadcasts', 'calls', 'campaigns', 'competitorPrices', 'fieldRequests',
  'leads', 'merchandisingAudits', 'mpesaTransactions', 'outletOnboarding',
  'referralRegistrationEvents', 'referralRegistrations', 'routes', 'sales', 'salesTargets',
  'teamMemberships', 'teams',
]);
const RESET_KEEP_COLLECTIONS = Object.freeze(['products', 'outlets', 'territories', 'regions', 'auditLog', 'securityEvents']);

function assertCanDeleteAccount({ target, currentUserId, activeManagers, ledTeams = [] }) {
  if (!target) throw new ApiError(404, 'Account not found');
  if (target.id === currentUserId) throw new ApiError(409, 'You cannot delete the account you are currently using');
  if (target.role === 'manager' && activeManagers <= 1) throw new ApiError(409, 'The last active manager account cannot be deleted');
  if (target.role === 'team_leader' && ledTeams.some((team) => team.active !== false)) {
    throw new ApiError(409, 'Reassign this team leader’s active teams before deleting the account');
  }
}

function assertSystemResetConfirmation(confirmText) {
  if (confirmText !== 'RESET SYSTEM DATA') throw new ApiError(400, 'Type RESET SYSTEM DATA exactly to confirm');
}

module.exports = { RESET_DELETE_COLLECTIONS, RESET_KEEP_COLLECTIONS, assertCanDeleteAccount, assertSystemResetConfirmation };
