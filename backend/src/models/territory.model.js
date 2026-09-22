const { z } = require('zod');

const TerritorySchema = z.object({
  name: z.string().min(1),
  description: z.string().trim().optional(),
});

module.exports = { TerritorySchema };
