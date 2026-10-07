const { z } = require('zod');

const DateValueSchema = z.string().datetime().or(z.number());

const FieldRequestCreateSchema = z.object({
  requestType: z.enum(['leave', 'field']),
  startsAt: DateValueSchema,
  endsAt: DateValueSchema.nullable().optional(),
  reason: z.string().trim().max(1000).optional(),
}).strict().refine((value) => !value.endsAt
  || new Date(value.endsAt).getTime() >= new Date(value.startsAt).getTime(), {
  message: 'endsAt must be at or after startsAt',
  path: ['endsAt'],
});

const FieldRequestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
}).strict();

module.exports = { FieldRequestCreateSchema, FieldRequestReviewSchema };
