const test = require('node:test');
const assert = require('node:assert/strict');
const { ReferralCreateSchema, ReferralStatusUpdateSchema, ReferralPaidSchema } = require('../src/models/referralRegistration.model');
const { normalizeKenyanPhone, referralDocumentId, canTransitionReferralStatus, isReferralCommissionEligible } = require('../src/services/referralRegistration.service');
const { RepCreateSchema } = require('../src/models/rep.model');

test('campaign recruiter accounts and candidate registrations validate', () => {
  assert.equal(RepCreateSchema.safeParse({ name: 'Campaign Recruiter', phone: '+254700000000', email: 'recruiter@example.test', password: 'Strong-password-1', role: 'recruiter' }).success, true);
  const candidate = { campaignId:'campaign-1', applicantName:'Amina Candidate', phone:'0712345678', county:'Nairobi', education:'KCSE', passportStatus:'will_get_self_funded', nitaFeeStatus:'not_paid', eligibleForWomenOnlyIntake:true, applicantConsent:true };
  assert.equal(ReferralCreateSchema.safeParse(candidate).success, true);
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
