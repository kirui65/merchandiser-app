const { z } = require('zod');

const PositionSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
}).strict();

const StockCheckSchema = z.object({
  productId: z.string().min(1),
  shelfQuantity: z.number().finite().nonnegative().optional(),
  backroomQuantity: z.number().finite().nonnegative().optional(),
  lowStock: z.boolean(),
  reorderRequested: z.boolean(),
}).strict();

const DeviationSchema = z.object({
  productId: z.string().optional(),
  expectedPosition: z.string().optional(),
  actualPosition: z.string().optional(),
  description: z.string().optional(),
}).strict();

const PlanogramSchema = z.object({
  standardId: z.string().optional(),
  compliant: z.boolean(),
  compliancePercent: z.number().finite().min(0).max(100).optional(),
  deviations: z.array(DeviationSchema).default([]),
}).strict();

const MerchandisingAuditCreateSchema = z.object({
  outletId: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  location: PositionSchema.optional(),
  observedAt: z.string().datetime().or(z.number()),
  stockChecks: z.array(StockCheckSchema).default([]),
  planogram: PlanogramSchema,
  photoStorageUris: z.array(z.string().min(1)).min(1),
  notes: z.string().optional(),
}).strict();

const MerchandisingAuditSchema = MerchandisingAuditCreateSchema.extend({
  id: z.string().optional(),
  merchandiserId: z.string(),
  teamId: z.string().nullable(),
  createdAt: z.any().optional(),
});

const MerchandisingAuditUpdateSchema = MerchandisingAuditCreateSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

module.exports = {
  MerchandisingAuditCreateSchema,
  MerchandisingAuditUpdateSchema,
  MerchandisingAuditSchema,
};
