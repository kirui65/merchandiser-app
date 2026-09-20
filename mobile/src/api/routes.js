// GPS ping batch upload — Phase 2.
import client from './client';

export async function postPingBatch(pings) {
  const response = await client.post('/routes/pings', { pings }, { validateStatus: () => true });
  return { status: response.status, data: response.data };
}

export async function getRoute(date) {
  const response = await client.get('/routes', { params: { date } });
  return response.data.route;
}
