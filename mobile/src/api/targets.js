import client from './client';

export async function fetchMyTargetProgress() {
  const { data } = await client.get('/targets/me');
  return data;
}
