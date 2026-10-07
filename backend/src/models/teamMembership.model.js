const { z } = require('zod');

const TeamMembershipCreateSchema = z.object({
  teamId: z.string().min(1),
  repId: z.string().min(1),
}).strict();

const TeamMembershipUpdateSchema = z.object({
  status: z.enum(['active', 'ended']),
}).strict();

module.exports = { TeamMembershipCreateSchema, TeamMembershipUpdateSchema };
