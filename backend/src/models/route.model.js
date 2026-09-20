const { z } = require('zod');

// Phase 2 — GPS ping ingestion. Included now so the shape is settled
// before route sync is wired up.
const PingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().datetime().or(z.number()),
});

const RouteSchema = z.object({
  id: z.string().optional(),
  repId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  pings: z.array(PingSchema).default([]),
  plannedOutletIds: z.array(z.string()).default([]),
  visitedOutletIds: z.array(z.string()).default([]),
});

const PingBatchSchema = z.object({
  pings: z.array(PingSchema).min(1).max(500),
});

module.exports = { RouteSchema, PingSchema, PingBatchSchema };
