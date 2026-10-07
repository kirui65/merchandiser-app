const { z } = require('zod');
const { LeadStatusSchema, LeadScoreSchema } = require('./lead.model');

const CallOutcomeSchema = z.enum([
  'answered',
  'no_answer',
  'busy',
  'voicemail',
  'callback_requested',
  'wrong_number',
]);
const DateValueSchema = z.string().datetime().or(z.number());

const CallCreateSchema = z.object({
  startedAt: DateValueSchema,
  endedAt: DateValueSchema.optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  outcome: CallOutcomeSchema,
  notes: z.string().optional(),
  followUpAt: DateValueSchema.nullable().optional(),
  statusAfterCall: LeadStatusSchema.optional(),
  scoreAfterCall: LeadScoreSchema.optional(),
}).strict();

const CallSchema = CallCreateSchema.extend({
  id: z.string().optional(),
  leadId: z.string(),
  telemarketerId: z.string(),
  teamId: z.string().nullable(),
  campaignId: z.string().nullable().optional(),
  createdAt: z.any().optional(),
});

module.exports = { CallOutcomeSchema, CallCreateSchema, CallSchema };
