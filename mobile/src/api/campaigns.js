import client from './client';

export async function fetchAvailableCampaigns() {
  const { data } = await client.get('/campaigns/available');
  return data.campaigns || [];
}
