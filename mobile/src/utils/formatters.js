export function formatKes(amount) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

export function formatDateTime(isoOrMs) {
  const d = new Date(isoOrMs);
  return d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(isoOrMs) {
  return new Date(isoOrMs).toLocaleDateString('en-KE', { dateStyle: 'medium' });
}

export function formatTime(isoOrMs) {
  return new Date(isoOrMs).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}
