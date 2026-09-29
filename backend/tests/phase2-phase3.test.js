const test = require('node:test');
const assert = require('node:assert/strict');
const { findVisitedOutletIds, findRouteAnomalies } = require('../src/services/geo.service');
const { reconcileRecords } = require('../src/services/reconciliation.service');

test('marks an outlet visited only inside the geofence', () => {
  const ping = { lat: 0, lng: 0 };
  assert.deepEqual(findVisitedOutletIds([ping], [{ id: 'near', location: { lat: 0, lng: 0.0005 } }], 100), ['near']);
  assert.deepEqual(findVisitedOutletIds([ping], [{ id: 'far', location: { lat: 0, lng: 0.002 } }], 100), []);
});

test('flags implausible route jumps for review without flagging normal travel', () => {
  const routes = [
    { id: 'fast', repId: 'r1', date: '2026-09-29', pings: [{ lat: 0, lng: 0, timestamp: '2026-09-29T09:00:00.000Z' }, { lat: 1, lng: 1, timestamp: '2026-09-29T09:01:00.000Z' }] },
    { id: 'normal', repId: 'r1', date: '2026-09-29', pings: [{ lat: 0, lng: 0, timestamp: '2026-09-29T10:00:00.000Z' }, { lat: 0, lng: 0.001, timestamp: '2026-09-29T10:01:00.000Z' }] },
  ];
  assert.deepEqual(findRouteAnomalies(routes, [{ id: 'r1', name: 'Rep One' }]).map((item) => item.routeId), ['fast']);
});

test('reconciliation matches earliest unmatched sale and leaves unrelated records open', () => {
  const sales = [
    { id: 's1', repId: 'r1', total: 100, timestamp: '2026-09-19T10:00:00.000Z' },
    { id: 's2', repId: 'r1', total: 100, timestamp: '2026-09-19T10:05:00.000Z' },
    { id: 's3', repId: 'r2', total: 100, timestamp: '2026-09-19T10:01:00.000Z' },
  ];
  const transactions = [
    { id: 't1', repId: 'r1', amount: 100, timestamp: '2026-09-19T10:06:00.000Z' },
    { id: 't2', repId: 'r1', amount: 100, timestamp: '2026-09-19T10:07:00.000Z' },
  ];
  const result = reconcileRecords(sales, transactions, 15);
  assert.deepEqual(result.matches.map(({ sale }) => sale.id), ['s1', 's2']);
  assert.deepEqual(result.unmatchedSales.map((sale) => sale.id), ['s3']);
  assert.equal(result.unmatchedTransactions.length, 0);
});