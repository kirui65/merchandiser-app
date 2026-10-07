const { z } = require('zod');

const ActivationActivityTypeSchema = z.enum([
  'product_sampling',
  'roadshow',
  'in_store_demo',
  'street_activation',
]);
const ActivationStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
const DateValueSchema = z.string().datetime().or(z.number());
const CoordinateSchema = z.number().finite().min(-180).max(180);

const ActivationLocationSchema = z.object({
  latitude: CoordinateSchema.min(-90).max(90),
  longitude: CoordinateSchema,
});

const ActivationMediaSchema = z.object({
  mediaId: z.string().uuid().optional(),
  storageUri: z.string().min(1),
  mediaType: z.enum(['photo', 'video']),
  contentType: z.string().min(1),
  capturedAt: DateValueSchema,
}).strict();

const SurveyResponseSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string(),
  respondentConsent: z.boolean(),
  capturedAt: DateValueSchema,
}).strict();

const SampleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
}).strict();

const ExpenseSchema = z.object({
  expenseType: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  receiptStorageUri: z.string().min(1).nullable().optional(),
  description: z.string().optional(),
  incurredAt: DateValueSchema,
}).strict();

const ActivationFieldsSchema = z.object({
  campaignId: z.string().nullable().optional(),
  activityType: ActivationActivityTypeSchema,
  status: ActivationStatusSchema.default('draft'),
  location: ActivationLocationSchema,
  startedAt: DateValueSchema,
  endedAt: DateValueSchema.nullable().optional(),
  footfallCount: z.number().int().nonnegative().default(0),
  media: z.array(ActivationMediaSchema).default([]),
  surveyResponses: z.array(SurveyResponseSchema).default([]),
  samplesDistributed: z.array(SampleSchema).default([]),
  floatAmount: z.number().finite().nonnegative().default(0),
  expenses: z.array(ExpenseSchema).default([]),
  floatRemaining: z.number().finite().nullable().optional(),
}).strict();

const ActivationCreateSchema = ActivationFieldsSchema.refine(
  (activation) => activation.status === 'draft' || activation.status === 'submitted',
  { message: 'New activations must be drafts or submitted', path: ['status'] },
);

const ActivationUpdateSchema = ActivationFieldsSchema.partial().strict()
  .refine((activation) => Object.keys(activation).length > 0, 'At least one field must be provided');

const ActivationSchema = ActivationFieldsSchema.extend({
  id: z.string().optional(),
  ambassadorId: z.string(),
  teamId: z.string().nullable(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

module.exports = {
  ActivationActivityTypeSchema,
  ActivationStatusSchema,
  ActivationCreateSchema,
  ActivationUpdateSchema,
  ActivationSchema,
};
