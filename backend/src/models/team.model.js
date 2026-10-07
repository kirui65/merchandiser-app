const { z } = require('zod');

const TeamCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  teamLeaderId: z.string().min(1),
  regionId: z.string().min(1),
  active: z.boolean().default(true),
}).strict();

const TeamUpdateSchema = TeamCreateSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

module.exports = { TeamCreateSchema, TeamUpdateSchema };
