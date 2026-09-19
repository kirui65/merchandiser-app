// Buffered GPS pings — Phase 2. Mirrors salesQueue.js's pattern (write
// locally first, sync in batches) once gpsTracker.js starts producing pings.
// TODO(Phase 2): pending_pings SQLite table + enqueue/getPending/markSynced.
