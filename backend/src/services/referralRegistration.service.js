const crypto = require('crypto');

const REFERRAL_STAGES = Object.freeze([
  'submitted',
  'contacted',
  'requirements_checked',
  'training_scheduled',
  'placed',
  'rejected',
]);
const COMMISSION_STAGES = Object.freeze(['requirements_checked', 'training_scheduled', 'placed']);

function normalizeKenyanPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) digits = `254${digits}`;
  if (!/^254[17]\d{8}$/.test(digits)) return null;
  return `+${digits}`;
}

function referralDocumentId(campaignId, normalizedPhone) {
  return crypto.createHash('sha256').update(`${campaignId}:${normalizedPhone}`).digest('hex');
}

function isReferralCommissionEligible(status, eligibleAt) {
  if (!eligibleAt || status === 'rejected') return false;
  const current = COMMISSION_STAGES.indexOf(status);
  const threshold = COMMISSION_STAGES.indexOf(eligibleAt);
  return current >= 0 && threshold >= 0 && current >= threshold;
}

function canTransitionReferralStatus(current, next) {
  if (current === next) return false;
  if (current === 'rejected' || current === 'placed') return false;
  if (next === 'rejected') return true;
  return REFERRAL_STAGES.indexOf(next) === REFERRAL_STAGES.indexOf(current) + 1;
}

module.exports = {
  REFERRAL_STAGES,
  COMMISSION_STAGES,
  normalizeKenyanPhone,
  referralDocumentId,
  isReferralCommissionEligible,
  canTransitionReferralStatus,
};
