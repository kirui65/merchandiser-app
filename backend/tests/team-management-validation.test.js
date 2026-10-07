const test = require('node:test');
const assert = require('node:assert/strict');
const { TeamCreateSchema } = require('../src/models/team.model');
const { RegionCreateSchema } = require('../src/models/region.model');
const { TeamMembershipCreateSchema } = require('../src/models/teamMembership.model');
const { BroadcastCreateSchema, BroadcastUpdateSchema } = require('../src/models/broadcast.model');
const { FieldRequestCreateSchema, FieldRequestReviewSchema } = require('../src/models/fieldRequest.model');

test('validates required team and region data', () => {
  assert.equal(TeamCreateSchema.safeParse({
    name: 'Nairobi North',
    teamLeaderId: 'leader-1',
    regionId: 'region-1',
  }).success, true);
  assert.equal(TeamCreateSchema.safeParse({
    name: '',
    teamLeaderId: '',
    regionId: 'region-1',
  }).success, false);
  assert.equal(RegionCreateSchema.safeParse({ name: 'Kenya', countryCode: 'ke' }).data.countryCode, 'KE');
  assert.equal(RegionCreateSchema.safeParse({ name: 'Kenya', countryCode: 'KEN' }).success, false);
});

test('validates team membership lifecycle inputs', () => {
  assert.equal(TeamMembershipCreateSchema.safeParse({ teamId: 'team-1', repId: 'rep-1' }).success, true);
  assert.equal(TeamMembershipCreateSchema.safeParse({ teamId: 'team-1' }).success, false);
});

test('validates broadcast and field-request transitions', () => {
  assert.equal(BroadcastCreateSchema.safeParse({
    teamId: 'team-1',
    title: 'Daily focus',
    message: 'Visit assigned outlets before 10am.',
  }).success, true);
  assert.equal(BroadcastUpdateSchema.safeParse({ status: 'published' }).success, true);
  assert.equal(BroadcastUpdateSchema.safeParse({ status: 'sent' }).success, false);

  assert.equal(FieldRequestCreateSchema.safeParse({
    requestType: 'leave',
    startsAt: '2026-10-09T08:00:00.000Z',
    endsAt: '2026-10-09T17:00:00.000Z',
  }).success, true);
  assert.equal(FieldRequestCreateSchema.safeParse({
    requestType: 'field',
    startsAt: '2026-10-09T17:00:00.000Z',
    endsAt: '2026-10-09T08:00:00.000Z',
  }).success, false);
  assert.equal(FieldRequestReviewSchema.safeParse({ status: 'approved' }).success, true);
  assert.equal(FieldRequestReviewSchema.safeParse({ status: 'pending' }).success, false);
});
