const { z } = require('zod');

// Shape accepted from the mobile client. repId is NOT accepted from the
// body — it is always taken from the authenticated JWT to prevent a rep
// from writing sales under another rep's id.
const SaleCreateSchema = z.object({
  localId: z.string().uuid(),
  outletId: z.string().min(1),
  productId: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  timestamp: z.string().datetime().or(z.number()), // ISO string or epoch ms, client's local capture time
  photoUrl: z.string().url().nullable().optional(),
  campaignId: z.string().nullable().optional(),
});

const SaleUpdateSchema = z.object({
  qty: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
}).strict().refine((sale) => Object.keys(sale).length > 0, 'At least one sale field must be provided');

const SaleVoidSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

const SaleSchema = SaleCreateSchema.extend({
  id: z.string().optional(),
  repId: z.string(),
  total: z.number().nonnegative(),
  syncStatus: z.enum(['pending', 'synced', 'failed']).default('synced'),
  saleStatus: z.enum(['active', 'voided']).default('active'),
  voidReason: z.string().optional(),
  voidedAt: z.any().optional(),
  voidedBy: z.string().optional(),
  createdAt: z.any().optional(),
});

function isActiveSale(sale) {
  return sale.saleStatus !== 'voided';
}

module.exports = { SaleCreateSchema, SaleUpdateSchema, SaleVoidSchema, SaleSchema, isActiveSale };
