// Shared enums/constants used across mobile, backend, and admin-dashboard.
// Keep this the single source of truth for status strings so they never
// drift between the three sub-projects.

const SALE_SYNC_STATUS = Object.freeze({
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
});

const REP_ROLE = Object.freeze({
  REP: 'rep',
  MANAGER: 'manager',
});

const MPESA_TXN_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

const RECONCILIATION_DEFAULT_WINDOW_MINUTES = 15;

module.exports = {
  SALE_SYNC_STATUS,
  REP_ROLE,
  MPESA_TXN_STATUS,
  RECONCILIATION_DEFAULT_WINDOW_MINUTES,
};
