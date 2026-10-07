const { z } = require('zod');

const RepRoleSchema = z.enum(['rep', 'manager', 'brand_ambassador', 'telemarketer', 'team_leader']);

const RepSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().optional(), // set server-side, never accepted from client input
  role: RepRoleSchema,
  assignedOutletIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  createdAt: z.any().optional(),
});

// Shape accepted from the client on create — never accept passwordHash directly.
const RepCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: RepRoleSchema.default('rep'),
  assignedOutletIds: z.array(z.string()).default([]),
});

const RepUpdateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  role: RepRoleSchema,
});

module.exports = { RepRoleSchema, RepSchema, RepCreateSchema, RepUpdateSchema };
