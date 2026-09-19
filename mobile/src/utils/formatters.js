export function formatKes(amount) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

export function formatDateTime(isoOrMs) {
  const d = new Date(isoOrMs);
  return d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}
