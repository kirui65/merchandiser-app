import client from './client';

export async function fetchTeamOverview() {
  const { data } = await client.get('/team-leader/overview');
  return data;
}

export async function fetchTeamLocations() {
  const { data } = await client.get('/team-leader/locations');
  return data;
}

export async function fetchBroadcasts(teamId) {
  const { data } = await client.get('/broadcasts', { params: teamId ? { teamId } : {} });
  return data.broadcasts;
}

export async function createBroadcast(payload) {
  const { data } = await client.post('/broadcasts', payload);
  return data.broadcast;
}

export async function updateBroadcast(id, payload) {
  const { data } = await client.patch(`/broadcasts/${id}`, payload);
  return data.broadcast;
}

export async function fetchFieldRequests(status) {
  const { data } = await client.get('/field-requests', { params: status ? { status } : {} });
  return data.requests;
}

export async function fetchMyFieldRequests() {
  const { data } = await client.get('/field-requests', { params: { mine: true } });
  return data.requests;
}

export async function reviewFieldRequest(id, status) {
  const { data } = await client.patch(`/field-requests/${id}/review`, { status });
  return data.request;
}

export async function createFieldRequest(payload) {
  const { data } = await client.post('/field-requests', payload);
  return data.request;
}

export async function deleteFieldRequest(id) {
  await client.delete(`/field-requests/${encodeURIComponent(id)}`);
}
