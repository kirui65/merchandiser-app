const test = require('node:test');
const assert = require('node:assert/strict');
const { MerchandisingAuditCreateSchema, MerchandisingAuditUpdateSchema } = require('../src/models/merchandisingAudit.model');
const { CompetitorPriceCreateSchema, CompetitorPriceUpdateSchema } = require('../src/models/competitorPrice.model');
const { OutletOnboardingCreateSchema } = require('../src/models/outletOnboarding.model');

test('validates stock checks, planogram and required photo evidence', () => {
  const audit = MerchandisingAuditCreateSchema.safeParse({
    outletId: 'outlet-1',
    observedAt: '2026-10-07T10:00:00.000Z',
    stockChecks: [{
      productId: 'product-1',
      shelfQuantity: 2,
      backroomQuantity: 3,
      lowStock: true,
      reorderRequested: true,
    }],
    planogram: {
      compliant: false,
      compliancePercent: 70,
      deviations: [{ productId: 'product-1', expectedPosition: 'top', actualPosition: 'bottom' }],
    },
    photoStorageUris: ['gs://bucket/merchandising/rep-1/shelf.jpg'],
  });
  assert.equal(audit.success, true);
  assert.equal(MerchandisingAuditUpdateSchema.safeParse({ notes: 'Corrected observation' }).success, true);
  assert.equal(MerchandisingAuditUpdateSchema.safeParse({}).success, false);
  assert.equal(MerchandisingAuditCreateSchema.safeParse({
    outletId: 'outlet-1',
    observedAt: '2026-10-07T10:00:00.000Z',
    planogram: { compliant: true, deviations: [] },
    photoStorageUris: [],
  }).success, false);
});

test('validates competitor prices as non-negative float KES values', () => {
  const valid = CompetitorPriceCreateSchema.safeParse({
    outletId: 'outlet-1',
    competitorName: 'Competitor',
    competitorProductName: 'Similar item',
    price: 125.5,
    observedAt: '2026-10-07T10:00:00.000Z',
  });
  const invalid = CompetitorPriceCreateSchema.safeParse({
    outletId: 'outlet-1',
    competitorName: 'Competitor',
    competitorProductName: 'Similar item',
    price: -1,
    observedAt: '2026-10-07T10:00:00.000Z',
  });
  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
  assert.equal(CompetitorPriceUpdateSchema.safeParse({ price: 120.5 }).success, true);
  assert.equal(CompetitorPriceUpdateSchema.safeParse({}).success, false);
});

test('requires GPS and photo evidence to submit a new outlet for review', () => {
  const valid = OutletOnboardingCreateSchema.safeParse({
    name: 'New shop',
    address: 'Nairobi',
    location: { lat: -1.28, lng: 36.82 },
    photoStorageUri: 'gs://bucket/merchandising/rep-1/shop.jpg',
  });
  assert.equal(valid.success, true);
  assert.equal(OutletOnboardingCreateSchema.safeParse({
    name: 'New shop',
    address: 'Nairobi',
    location: { lat: -1.28, lng: 36.82 },
    photoStorageUri: '',
  }).success, false);
});
