const test = require('node:test');
const assert = require('node:assert/strict');
const { SaleCreateSchema } = require('../src/models/sale.model');

test('accepts a valid sale payload', () => {
  const payload = {
    localId: '123e4567-e89b-12d3-a456-426614174000',
    outletId: 'outlet-1',
    productId: 'product-1',
    qty: 2,
    unitPrice: 15.5,
    timestamp: '2026-10-06T10:15:00.000Z',
    photoUrl: 'https://example.com/photo.jpg',
  };

  const result = SaleCreateSchema.safeParse(payload);
  assert.equal(result.success, true);
});

test('rejects invalid sale quantities and prices', () => {
  const invalidQty = SaleCreateSchema.safeParse({
    localId: '123e4567-e89b-12d3-a456-426614174000',
    outletId: 'outlet-1',
    productId: 'product-1',
    qty: 0,
    unitPrice: 15.5,
    timestamp: '2026-10-06T10:15:00.000Z',
  });

  const invalidPrice = SaleCreateSchema.safeParse({
    localId: '123e4567-e89b-12d3-a456-426614174000',
    outletId: 'outlet-1',
    productId: 'product-1',
    qty: 2,
    unitPrice: -1,
    timestamp: '2026-10-06T10:15:00.000Z',
  });

  assert.equal(invalidQty.success, false);
  assert.equal(invalidPrice.success, false);
});
