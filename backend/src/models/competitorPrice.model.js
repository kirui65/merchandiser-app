const { z } = require('zod');

const CompetitorPriceCreateSchema = z.object({
  outletId: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  competitorName: z.string().min(1),
  competitorProductName: z.string().min(1),
  competitorSku: z.string().optional(),
  ourProductId: z.string().nullable().optional(),
  price: z.number().finite().nonnegative(),
  observedAt: z.string().datetime().or(z.number()),
  photoStorageUri: z.string().min(1).nullable().optional(),
}).strict();

const CompetitorPriceSchema = CompetitorPriceCreateSchema.extend({
  id: z.string().optional(),
  merchandiserId: z.string(),
  teamId: z.string().nullable(),
  createdAt: z.any().optional(),
});

const CompetitorPriceUpdateSchema = CompetitorPriceCreateSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

module.exports = {
  CompetitorPriceCreateSchema,
  CompetitorPriceUpdateSchema,
  CompetitorPriceSchema,
};
