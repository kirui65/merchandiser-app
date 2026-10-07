const test = require('node:test');
const assert = require('node:assert/strict');
const { getActiveTeamIdForUser } = require('../src/services/teamMembership.service');

function fakeFirestore(memberships, teams) {
  return {
    collection(name) {
      if (name === 'teamMemberships') {
        const filters = {};
        const query = {
          where(field, _operator, value) {
            filters[field] = value;
            return query;
          },
          async get() {
            const matching = memberships.filter((item) =>
              Object.entries(filters).every(([field, value]) => item[field] === value));
            return { docs: matching.map((item) => ({ data: () => item })) };
          },
        };
        return query;
      }
      return {
        doc(id) {
          return {
            async get() {
              const team = teams[id];
              return team
                ? { id, exists: true, data: () => team }
                : { id, exists: false, data: () => null };
            },
          };
        },
      };
    },
  };
}

test('resolves only an active team from the user active membership', async () => {
  const teamId = await getActiveTeamIdForUser('rep-1', fakeFirestore(
    [
      { repId: 'rep-1', teamId: 'team-live', status: 'active' },
      { repId: 'rep-1', teamId: 'team-ended', status: 'ended' },
      { repId: 'rep-2', teamId: 'team-other', status: 'active' },
    ],
    {
      'team-live': { active: true },
      'team-ended': { active: true },
      'team-other': { active: true },
    },
  ));
  assert.equal(teamId, 'team-live');
});

test('returns null when there is no active membership or active team', async () => {
  assert.equal(await getActiveTeamIdForUser('rep-1', fakeFirestore(
    [{ repId: 'rep-1', teamId: 'disabled', status: 'active' }],
    { disabled: { active: false } },
  )), null);
});

test('rejects ambiguous multiple active team memberships', async () => {
  await assert.rejects(
    getActiveTeamIdForUser('rep-1', fakeFirestore(
      [
        { repId: 'rep-1', teamId: 'team-1', status: 'active' },
        { repId: 'rep-1', teamId: 'team-2', status: 'active' },
      ],
      { 'team-1': { active: true }, 'team-2': { active: true } },
    )),
    { statusCode: 409 },
  );
});
