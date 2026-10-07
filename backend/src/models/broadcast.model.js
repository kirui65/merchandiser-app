const { z } = require('zod');

const DateValueSchema = z.string().datetime().or(z.number());

const BroadcastCreateSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
  expiresAt: DateValueSchema.nullable().optional(),
}).strict();

const BroadcastUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  message: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  expiresAt: DateValueSchema.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

module.exports = { BroadcastCreateSchema, BroadcastUpdateSchema };
