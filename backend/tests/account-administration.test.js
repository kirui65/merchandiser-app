const test = require('node:test');
const assert = require('node:assert/strict');
const { ApiError } = require('../src/middleware/errorHandler');
const {
  RESET_DELETE_COLLECTIONS,
  RESET_KEEP_COLLECTIONS,
  assertCanDeleteAccount,
  assertSystemResetConfirmation,
} = require('../src/services/accountAdministration.service');

test('account deletion protects the active manager and teams from orphaned leaders', () => {
  assert.throws(() => assertCanDeleteAccount({ target: { id:'manager-1', role:'manager' }, currentUserId:'manager-1', activeManagers:2 }), ApiError);
  assert.throws(() => assertCanDeleteAccount({ target: { id:'manager-2', role:'manager' }, currentUserId:'manager-1', activeManagers:1 }), /last active manager/);
  assert.throws(() => assertCanDeleteAccount({ target: { id:'leader-1', role:'team_leader' }, currentUserId:'manager-1', activeManagers:2, ledTeams:[{ active:true }] }), /Reassign this team leader/);
  assert.doesNotThrow(() => assertCanDeleteAccount({ target:{ id:'rep-1', role:'rep' }, currentUserId:'manager-1', activeManagers:1 }));
});

test('global reset requires its exact confirmation and preserves management/configuration records', () => {
  assert.throws(() => assertSystemResetConfirmation('RESET'), /Type RESET SYSTEM DATA exactly/);
  assert.doesNotThrow(() => assertSystemResetConfirmation('RESET SYSTEM DATA'));
  for (const protectedCollection of ['reps', 'repEmailIndex', 'products', 'outlets', 'territories', 'regions', 'auditLog', 'securityEvents']) {
    assert.equal(RESET_DELETE_COLLECTIONS.includes(protectedCollection), false);
    if (protectedCollection !== 'reps' && protectedCollection !== 'repEmailIndex') assert.equal(RESET_KEEP_COLLECTIONS.includes(protectedCollection), true);
  }
  for (const operationalCollection of ['sales', 'leads', 'referralRegistrations', 'campaigns', 'teams', 'teamMemberships']) {
    assert.equal(RESET_DELETE_COLLECTIONS.includes(operationalCollection), true);
  }
});
