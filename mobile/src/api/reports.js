import client from './client';

export async function fetchCompanyReport(from, to) {
  const { data } = await client.get('/reports/company', { params: { from, to } });
  return data;
}
