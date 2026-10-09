const { z } = require('zod');

const ReferralStatusSchema = z.enum([
  'submitted',
  'contacted',
  'requirements_checked',
  'training_scheduled',
  'placed',
  'rejected',
]);

const ReferralCreateSchema = z.object({
  campaignId: z.string().min(1),
  applicantName: z.string().trim().min(2).max(160),
  applicantIdNumber: z.string().trim().regex(/^\d{7,10}$/, 'Enter a valid national ID number'),
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  county: z.string().trim().min(2).max(100),
  education: z.enum(['KCPE', 'KCSE', 'certificate', 'diploma', 'degree', 'postgraduate', 'other']),
  passportStatus: z.enum(['has_passport', 'will_get_self_funded', 'not_ready']),
  nitaFeeStatus: z.enum(['not_paid', 'paid']),
  eligibleForWomenOnlyIntake: z.literal(true),
  applicantConsent: z.literal(true),
}).strict();

const ReferralStatusUpdateSchema = z.object({
  status: ReferralStatusSchema,
  note: z.string().trim().max(1000).optional(),
}).strict();

const ReferralPaidSchema = z.object({
  paymentReference: z.string().trim().min(2).max(120),
}).strict();

module.exports = {
  ReferralStatusSchema,
  ReferralCreateSchema,
  ReferralStatusUpdateSchema,
  ReferralPaidSchema,
};
