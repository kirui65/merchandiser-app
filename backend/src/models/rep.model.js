const { z } = require('zod');

const RepSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().optional(), // set server-side, never accepted from client input
  role: z.enum(['rep', 'manager']),
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
  role: z.enum(['rep', 'manager']).default('rep'),
  assignedOutletIds: z.array(z.string()).default([]),
});

module.exports = { RepSchema, RepCreateSchema };
