const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCompanyReport } = require('../src/services/companyReport.service');

test('rolls up all field activity and filters by campaign, region, and record date', () => {
  const report = buildCompanyReport({
    from: Date.parse('2026-10-01T00:00:00.000Z'),
    to: Date.parse('2026-10-31T23:59:59.999Z'),
    campaignId: 'campaign-a',
    regionId: 'region-a',
    teams: [
      { id: 'team-a', regionId: 'region-a' },
      { id: 'team-b', regionId: 'region-b' },
    ],
    sales: [
      { id: 's1', teamId: 'team-a', campaignId: 'campaign-a', timestamp: '2026-10-12T10:00:00.000Z', total: 100.25 },
      { id: 's2', teamId: 'team-b', campaignId: 'campaign-a', timestamp: '2026-10-12T10:00:00.000Z', total: 90 },
      { id: 's3', teamId: 'team-a', campaignId: null, timestamp: '2026-10-12T10:00:00.000Z', total: 40 },
      { id: 's4', teamId: 'team-a', campaignId: 'campaign-a', timestamp: '2026-09-30T23:59:59.999Z', total: 30 },
    ],
    activations: [
      { teamId: 'team-a', campaignId: 'campaign-a', startedAt: new Date('2026-10-10T08:00:00.000Z'), footfallCount: 25 },
      { teamId: 'team-b', campaignId: 'campaign-a', startedAt: new Date('2026-10-10T08:00:00.000Z'), footfallCount: 10 },
    ],
    leads: [
      { teamId: 'team-a', campaignId: 'campaign-a', createdAt: { _seconds: Date.parse('2026-10-05T00:00:00.000Z') / 1000 }, status: 'qualified' },
      { teamId: 'team-a', campaignId: 'campaign-a', createdAt: '2026-10-05T00:00:00.000Z', status: 'new' },
    ],
    audits: [
      { teamId: 'team-a', campaignId: 'campaign-a', observedAt: new Date('2026-10-06T00:00:00.000Z'), stockChecks: [{ lowStock: true }, { lowStock: false }], planogram: { compliant: true } },
    ],
  });

  assert.deepEqual(report, {
    sales: { count: 1, total: 100.25 },
    activations: { count: 1, footfallCount: 25 },
    leads: { count: 2, byStatus: { new: 1, contacted: 0, qualified: 1, converted: 0, not_interested: 0, closed: 0 } },
    merchandisingAudits: { count: 1, lowStockChecks: 1, compliantPlanograms: 1 },
  });
});
