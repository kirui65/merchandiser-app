const test = require('node:test');
const assert = require('node:assert/strict');
const { SaleUpdateSchema, SaleVoidSchema, isActiveSale } = require('../src/models/sale.model');
const { EDIT_WINDOW_MS, canEditSale } = require('../src/services/saleMutation.service');

test('sale edits accept only editable fields and require at least one change', () => {
  assert.equal(SaleUpdateSchema.safeParse({ qty: 2, unitPrice: 10 }).success, true);
  assert.equal(SaleUpdateSchema.safeParse({}).success, false);
  assert.equal(SaleUpdateSchema.safeParse({ repId: 'another-rep' }).success, false);
  assert.equal(SaleUpdateSchema.safeParse({ productId: 'another-product' }).success, false);
});

test('sale voids require a meaningful reason and trim surrounding whitespace', () => {
  assert.equal(SaleVoidSchema.safeParse({ reason: '  wrong quantity  ' }).data.reason, 'wrong quantity');
  assert.equal(SaleVoidSchema.safeParse({ reason: 'no' }).success, false);
  assert.equal(SaleVoidSchema.safeParse({ reason: 'valid reason', saleStatus: 'active' }).success, false);
});

test('sale edit window is based on server creation time and voided sales are immutable', () => {
  const now = Date.now();
  assert.equal(canEditSale({ createdAt: new Date(now - EDIT_WINDOW_MS).toISOString() }, now), true);
  assert.equal(canEditSale({ createdAt: new Date(now - EDIT_WINDOW_MS - 1).toISOString() }, now), false);
  assert.equal(canEditSale({ createdAt: new Date(now + 1).toISOString() }, now), false);
  assert.equal(canEditSale({ createdAt: new Date(now).toISOString(), saleStatus: 'voided' }, now), false);
  assert.equal(isActiveSale({ saleStatus: 'active' }), true);
  assert.equal(isActiveSale({ saleStatus: 'voided' }), false);
});
