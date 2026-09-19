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
});

const SaleSchema = SaleCreateSchema.extend({
  id: z.string().optional(),
  repId: z.string(),
  total: z.number().nonnegative(),
  syncStatus: z.enum(['pending', 'synced', 'failed']).default('synced'),
  createdAt: z.any().optional(),
});

module.exports = { SaleCreateSchema, SaleSchema };
