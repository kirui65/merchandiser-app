import client from './client';

export async function fetchMyMonthlyRank() {
  const { data } = await client.get('/dashboard/totals');
  return data;
}
