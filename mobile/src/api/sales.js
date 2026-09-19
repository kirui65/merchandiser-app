// Thin wrapper matching the shape syncManager.js expects from its `api`
// dependency: postSale returns { status, data } rather than throwing on
// non-2xx, so the sync manager can branch on status codes (e.g. treat a
// duplicate-localId 200 the same as a fresh 201).
import client from './client';

export async function postSale(sale) {
  try {
    const response = await client.post('/sales', sale, { validateStatus: () => true });
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
