const { z } = require('zod');

const LeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'converted', 'not_interested', 'closed']);
const LeadScoreSchema = z.enum(['hot', 'warm', 'cold', 'unscored']);
const DateValueSchema = z.string().datetime().or(z.number());

const LeadCreateSchema = z.object({
  campaignId: z.string().nullable().optional(),
  name: z.string().min(1),
  organization: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  source: z.string().optional(),
  status: LeadStatusSchema.default('new'),
  score: LeadScoreSchema.default('unscored'),
  scoreValue: z.number().optional(),
  nextFollowUpAt: DateValueSchema.nullable().optional(),
  notes: z.string().optional(),
});

const LeadUpdateSchema = z.object({
  status: LeadStatusSchema.optional(),
  score: LeadScoreSchema.optional(),
  scoreValue: z.number().nullable().optional(),
  nextFollowUpAt: DateValueSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

const LeadSchema = LeadCreateSchema.extend({
  id: z.string().optional(),
  telemarketerId: z.string(),
  teamId: z.string().nullable(),
  callCount: z.number().int().nonnegative().default(0),
  lastCalledAt: DateValueSchema.nullable().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

module.exports = {
  LeadStatusSchema,
  LeadScoreSchema,
  LeadCreateSchema,
  LeadUpdateSchema,
  LeadSchema,
};
