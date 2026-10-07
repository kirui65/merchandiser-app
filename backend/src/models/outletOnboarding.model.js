const { z } = require('zod');

const OutletOnboardingCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  location: z.object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  }).strict(),
  photoStorageUri: z.string().min(1),
}).strict();

const OutletOnboardingSchema = OutletOnboardingCreateSchema.extend({
  id: z.string().optional(),
  submittedBy: z.string(),
  status: z.enum(['pending_review', 'approved', 'rejected']),
  outletId: z.string().optional(),
  reviewedAt: z.any().optional(),
  createdAt: z.any().optional(),
});

module.exports = { OutletOnboardingCreateSchema, OutletOnboardingSchema };
