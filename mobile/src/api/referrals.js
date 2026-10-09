import client from './client';

export async function getRecruitmentCampaigns() { return (await client.get('/referrals/campaigns/available')).data.campaigns || []; }
export async function getReferralSummary() { return (await client.get('/referrals/summary')).data.summary; }
export async function getReferrals() { return (await client.get('/referrals')).data.referrals || []; }
export async function submitReferral(payload) { return (await client.post('/referrals', payload)).data.referral; }
