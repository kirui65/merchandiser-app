const test = require('node:test');
const assert = require('node:assert/strict');
const { RepCreateSchema } = require('../src/models/rep.model');
const { LeadCreateSchema, LeadUpdateSchema } = require('../src/models/lead.model');
const { CallCreateSchema } = require('../src/models/call.model');

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
