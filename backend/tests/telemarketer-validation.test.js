const test = require('node:test');
const assert = require('node:assert/strict');
const { RepCreateSchema } = require('../src/models/rep.model');
const { LeadCreateSchema, LeadUpdateSchema } = require('../src/models/lead.model');
const { CallCreateSchema } = require('../src/models/call.model');
const { assertPickedRoleMatches } = require('../src/services/authRole.service');
const { requireRole, authenticatedUserFromAccount } = require('../src/middleware/auth.middleware');

test('accepts the approved additional rep roles without renaming legacy roles', () => {
  for (const role of ['rep', 'manager', 'brand_ambassador', 'telemarketer', 'team_leader']) {
    const result = RepCreateSchema.safeParse({
      name: 'Test User',
      phone: '+254700000000',
      email: 'user@example.com',
      password: 'password123',
      role,
    });
    assert.equal(result.success, true, `expected ${role} to be accepted`);
  }
});

test('picked login role maps merchandiser/admin labels to stored legacy roles', () => {
  assert.equal(assertPickedRoleMatches('rep', 'merchandiser'), undefined);
  assert.equal(assertPickedRoleMatches('manager', 'admin'), undefined);
  assert.equal(assertPickedRoleMatches('telemarketer', 'telemarketer'), undefined);
  assert.equal(assertPickedRoleMatches('manager', undefined), undefined);
});

test('picked login role rejects mismatches with the specified 403 message', () => {
  assert.throws(
    () => assertPickedRoleMatches('rep', 'admin'),
    { statusCode: 403, message: 'This account is not registered as admin' },
  );
  assert.throws(
    () => assertPickedRoleMatches('telemarketer', 'brand_ambassador'),
    { statusCode: 403, message: 'This account is not registered as brand_ambassador' },
  );
  assert.throws(() => assertPickedRoleMatches('rep', 'superuser'), {
    statusCode: 400,
    message: 'Invalid role selection',
  });
});

test('requireRole middleware authorizes only one of its configured roles', () => {
  const middleware = requireRole('telemarketer', 'manager');
  let nextError;
  middleware({ user: { role: 'telemarketer' } }, {}, (error) => { nextError = error; });
  assert.equal(nextError, undefined);
  middleware({ user: { role: 'rep' } }, {}, (error) => { nextError = error; });
  assert.equal(nextError.statusCode, 403);
  assert.equal(nextError.message, 'telemarketer or manager role required');
});

test('a role claim cannot grant access beyond the account role stored by the server', () => {
  const tokenClaims = { uid: 'rep-1', role: 'manager' };
  const authenticatedUser = authenticatedUserFromAccount(tokenClaims.uid, { role: 'rep' });
  let nextError;
  requireRole('manager')({ user: authenticatedUser }, {}, (error) => { nextError = error; });
  assert.equal(authenticatedUser.role, 'rep');
  assert.equal(nextError.statusCode, 403);
});

test('validates lead creation and only allows editable lead fields on update', () => {
  const validLead = LeadCreateSchema.safeParse({
    name: 'Prospect',
    phone: '+254700000000',
    campaignId: null,
    status: 'new',
    score: 'unscored',
  });
  assert.equal(validLead.success, true);

  const injectedOwner = LeadUpdateSchema.safeParse({ telemarketerId: 'another-user' });
  const invalidStatus = LeadUpdateSchema.safeParse({ status: 'pending' });
  assert.equal(injectedOwner.success, false);
  assert.equal(invalidStatus.success, false);
});

test('accepts controlled call outcomes and rejects unsupported outcomes', () => {
  const call = {
    startedAt: '2026-10-07T10:00:00.000Z',
    outcome: 'callback_requested',
    followUpAt: '2026-10-08T10:00:00.000Z',
    statusAfterCall: 'contacted',
    scoreAfterCall: 'warm',
  };
  assert.equal(CallCreateSchema.safeParse(call).success, true);
  assert.equal(CallCreateSchema.safeParse({ ...call, outcome: 'made_a_sale' }).success, false);
});
