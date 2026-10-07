const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ActivationCreateSchema,
  ActivationUpdateSchema,
} = require('../src/models/activation.model');

const validActivation = {
  activityType: 'product_sampling',
  status: 'draft',
  location: { latitude: -1.286389, longitude: 36.817223 },
  startedAt: '2026-10-07T08:00:00.000Z',
  footfallCount: 12,
  media: [{
    mediaId: '123e4567-e89b-12d3-a456-426614174000',
    storageUri: 'gs://test-bucket/activations/ambassador/photo.jpg',
    mediaType: 'photo',
    contentType: 'image/jpeg',
    capturedAt: '2026-10-07T08:10:00.000Z',
  }],
  surveyResponses: [{
    questionId: 'brand-awareness',
    answer: 'Yes',
    respondentConsent: true,
    capturedAt: '2026-10-07T08:12:00.000Z',
  }],
  samplesDistributed: [{ productId: 'product-1', quantity: 3, unit: 'piece' }],
  floatAmount: 2500.5,
  expenses: [{
    expenseType: 'transport',
    amount: 120.75,
    receiptStorageUri: 'gs://test-bucket/activations/ambassador/receipt.jpg',
    incurredAt: '2026-10-07T08:15:00.000Z',
  }],
  floatRemaining: 2379.75,
};

test('accepts the approved activation shape with float KES amounts', () => {
  const result = ActivationCreateSchema.safeParse(validActivation);
  assert.equal(result.success, true);
  assert.equal(result.data.floatAmount, 2500.5);
});

test('rejects unsupported activity types, invalid coordinates, and negative money', () => {
  assert.equal(ActivationCreateSchema.safeParse({ ...validActivation, activityType: 'concert' }).success, false);
  assert.equal(ActivationCreateSchema.safeParse({
    ...validActivation,
    location: { latitude: 91, longitude: 36 },
  }).success, false);
  assert.equal(ActivationCreateSchema.safeParse({
    ...validActivation,
    expenses: [{ expenseType: 'transport', amount: -1, incurredAt: validActivation.startedAt }],
  }).success, false);
});

test('only permits drafts and submissions on activation create and requires non-empty updates', () => {
  assert.equal(ActivationCreateSchema.safeParse({ ...validActivation, status: 'approved' }).success, false);
  assert.equal(ActivationUpdateSchema.safeParse({}).success, false);
  assert.equal(ActivationUpdateSchema.safeParse({ status: 'approved' }).success, true);
});
