const { z } = require('zod');

const GeoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const OutletSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  location: GeoPointSchema,
  address: z.string().min(1),
  assignedRepId: z.string().optional(),
  active: z.boolean().default(true),
});

module.exports = { OutletSchema, GeoPointSchema };
