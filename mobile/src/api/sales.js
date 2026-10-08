// Thin wrapper matching the shape syncManager.js expects from its `api`
// dependency: postSale returns { status, data } rather than throwing on
// non-2xx, so the sync manager can branch on status codes (e.g. treat a
// duplicate-localId 200 the same as a fresh 201).
import client from './client';

export async function postSale(sale) {
  try {
    const { pendingVoidReason, ...salePayload } = sale;
    const response = await client.post('/sales', salePayload, { validateStatus: () => true });
    if ((response.status === 200 || response.status === 201) && pendingVoidReason) {
      const saleId = response.data?.sale?.id;
      if (!saleId) return { status: 502, data: { message: 'Sale sync returned no sale ID for the pending void.' } };
      const voidResponse = await client.post(`/sales/${encodeURIComponent(saleId)}/void`, { reason: pendingVoidReason }, { validateStatus: () => true });
      if (voidResponse.status !== 200 && voidResponse.status !== 201) return { status: voidResponse.status, data: voidResponse.data };
    }
    return { status: response.status, data: response.data };
  } catch (err) {
    // Network-level failure (no response at all) — rethrow so syncManager's
    // catch block marks it failed/retryable rather than treating it as a
    // definitive server response.
    throw err;
  }
}

export async function fetchMySales() {
  const { data } = await client.get('/sales');
  return data.sales;
}

export async function updateSale(id, updates) {
  const { data } = await client.patch(`/sales/${encodeURIComponent(id)}`, updates);
  return data.sale;
}

export async function voidSale(id, reason) {
  const { data } = await client.post(`/sales/${encodeURIComponent(id)}/void`, { reason });
  return data.sale;
}
