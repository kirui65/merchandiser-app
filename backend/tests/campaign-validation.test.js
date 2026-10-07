const test = require('node:test');
const assert = require('node:assert/strict');
const { CampaignCreateSchema, CampaignUpdateSchema } = require('../src/models/campaign.model');
const { isCampaignAssignedToTeam } = require('../src/services/campaign.service');

test('validates campaign schedule, status, and assignment fields', () => {
  const valid = {
    clientName: 'Acme',
    name: 'Summer launch',
    regionIds: ['region-1'],
    teamIds: ['team-1'],
    status: 'draft',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-10-31T23:59:59.999Z',
  };
  assert.equal(CampaignCreateSchema.safeParse(valid).success, true);
  assert.equal(CampaignCreateSchema.safeParse({ ...valid, endsAt: '2026-09-30T23:59:59.999Z' }).success, false);
  assert.equal(CampaignCreateSchema.safeParse({ ...valid, status: 'running' }).success, false);
  assert.equal(CampaignUpdateSchema.safeParse({ teamIds: ['team-2'] }).success, true);
});

test('campaign assignment requires the record team to be assigned', () => {
  const campaign = { teamIds: ['team-a', 'team-b'] };
  assert.equal(isCampaignAssignedToTeam(campaign, 'team-a'), true);
  assert.equal(isCampaignAssignedToTeam(campaign, 'team-c'), false);
  assert.equal(isCampaignAssignedToTeam(campaign, null), false);
});
