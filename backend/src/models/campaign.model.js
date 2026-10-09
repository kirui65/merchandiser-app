const { z } = require('zod');

const DateValueSchema = z.string().datetime().or(z.number());

const CampaignFieldsSchema = z.object({
  clientName: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  regionIds: z.array(z.string().min(1)).default([]),
  teamIds: z.array(z.string().min(1)).default([]),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).default('draft'),
  startsAt: DateValueSchema,
  endsAt: DateValueSchema.nullable().optional(),
  programType: z.enum(['field_sales', 'candidate_recruitment']).default('field_sales'),
  referralCommissionKsh: z.number().finite().nonnegative().nullable().optional(),
  referralCommissionAt: z.enum(['requirements_checked', 'training_scheduled', 'placed']).nullable().optional(),
}).strict();

const hasValidSchedule = (value) => !value.endsAt
  || new Date(value.endsAt).getTime() >= new Date(value.startsAt).getTime();

const CampaignCreateSchema = CampaignFieldsSchema.refine(hasValidSchedule, {
  message: 'endsAt must be at or after startsAt',
  path: ['endsAt'],
});

const CampaignUpdateSchema = CampaignFieldsSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const CampaignSchema = CampaignFieldsSchema.extend({
  id: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

module.exports = { CampaignCreateSchema, CampaignUpdateSchema, CampaignSchema };
