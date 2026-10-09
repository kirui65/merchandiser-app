const test = require('node:test');
const assert = require('node:assert/strict');
const { ReferralCreateSchema, ReferralStatusUpdateSchema, ReferralPaidSchema } = require('../src/models/referralRegistration.model');
const { normalizeKenyanPhone, referralDocumentId, canTransitionReferralStatus, isReferralCommissionEligible } = require('../src/services/referralRegistration.service');
const { RepCreateSchema } = require('../src/models/rep.model');

test('campaign recruiter accounts and candidate registrations validate', () => {
  assert.equal(RepCreateSchema.safeParse({ name: 'Campaign Recruiter', phone: '+254700000000', email: 'recruiter@example.test', password: 'Strong-password-1', role: 'recruiter' }).success, true);
  const candidate = { campaignId:'campaign-1', applicantName:'Amina Candidate', applicantIdNumber:'12345678', phone:'0712345678', email:'AMINA@example.test', county:'Nairobi', education:'diploma', passportStatus:'will_get_self_funded', nitaFeeStatus:'not_paid', eligibleForWomenOnlyIntake:true, applicantConsent:true };
  const parsed = ReferralCreateSchema.safeParse(candidate);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.email, 'amina@example.test');
  assert.equal(ReferralCreateSchema.safeParse({ ...candidate, applicantIdNumber:'id-123' }).success, false);
  assert.equal(ReferralCreateSchema.safeParse({ ...candidate, education:'both' }).success, false);
  assert.equal(ReferralCreateSchema.safeParse({ ...candidate, applicantConsent:false }).success, false);
  assert.equal(ReferralStatusUpdateSchema.safeParse({ status:'requirements_checked' }).success, true);
  assert.equal(ReferralPaidSchema.safeParse({ paymentReference:'M-PESA-12345' }).success, true);
});

test('Kenyan mobile numbers normalize for duplicate protection and referral stages stay sequential', () => {
  const local = normalizeKenyanPhone('0712 345 678');
  assert.equal(local, '+254712345678');
  assert.equal(normalizeKenyanPhone('+254 712 345 678'), local);
  assert.equal(referralDocumentId('campaign-1', local), referralDocumentId('campaign-1', normalizeKenyanPhone('0712345678')));
  assert.equal(normalizeKenyanPhone('12345'), null);
  assert.equal(canTransitionReferralStatus('submitted','contacted'), true);
  assert.equal(canTransitionReferralStatus('submitted','placed'), false);
  assert.equal(canTransitionReferralStatus('placed','rejected'), false);
  assert.equal(isReferralCommissionEligible('training_scheduled','requirements_checked'), true);
  assert.equal(isReferralCommissionEligible('contacted','requirements_checked'), false);
});
