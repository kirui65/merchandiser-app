import client from './client';

export async function fetchLeads(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'all'));
  const { data } = await client.get('/leads', { params });
  return data.leads;
}

export async function fetchLead(id) {
  const { data } = await client.get(`/leads/${id}`);
  return data.lead;
}

export async function createLead(lead) {
  const { data } = await client.post('/leads', lead);
  return data.lead;
}

export async function updateLead(id, changes) {
  const { data } = await client.patch(`/leads/${id}`, changes);
  return data.lead;
}

export async function fetchCalls(filters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const { data } = await client.get('/calls', { params });
  return data.calls;
}

export async function logCall(leadId, call, idempotencyKey) {
  const { data } = await client.post(`/calls/${leadId}`, call, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data.call;
}
