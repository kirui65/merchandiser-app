const { z } = require('zod');

const RegionCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  active: z.boolean().default(true),
}).strict();

const RegionUpdateSchema = RegionCreateSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

module.exports = { RegionCreateSchema, RegionUpdateSchema };
