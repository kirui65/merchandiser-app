const EDIT_WINDOW_MS = 15 * 60 * 1000;

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function canEditSale(sale, now = Date.now()) {
  if (!sale || sale.saleStatus === 'voided') return false;
  const createdAt = timestampMillis(sale.createdAt ?? sale.timestamp);
  return createdAt !== null && now >= createdAt && now - createdAt <= EDIT_WINDOW_MS;
}

module.exports = { EDIT_WINDOW_MS, canEditSale };
