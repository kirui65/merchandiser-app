const { getFirestore, admin } = require('../config/firebase');
const { getDoc, listDocs } = require('../services/firestore.service');
const { getActiveTeamIdForUser } = require('../services/teamMembership.service');
const { ApiError } = require('../middleware/errorHandler');
const {
  canTransitionReferralStatus,
  isReferralCommissionEligible,
  normalizeKenyanPhone,
  referralDocumentId,
} = require('../services/referralRegistration.service');

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function canReadReferral(user, referral) {
  return user.role === 'manager'
    || (user.role === 'recruiter' && referral.recruiterId === user.uid)
    || (user.role === 'team_leader' && (user.teamIds || []).includes(referral.teamId));
}

function commissionInfo(referral, campaign) {
  const amountKsh = Number(campaign?.referralCommissionKsh);
  const eligibleAt = campaign?.referralCommissionAt;
  const configured = Number.isFinite(amountKsh) && amountKsh > 0 && Boolean(eligibleAt);
  const eligible = configured && isReferralCommissionEligible(referral.status, eligibleAt);
  return {
    commissionAmountKsh: configured ? amountKsh : null,
    commissionEligibleAt: eligibleAt || null,
    commissionConfigured: configured,
    commissionEligible: eligible,
    payoutStatus: referral.paidAt ? 'paid' : eligible ? 'due' : configured ? 'not_eligible' : 'not_configured',
  };
}

async function availableCampaigns(req, res, next) {
  try {
    const teamId = await getActiveTeamIdForUser(req.user.uid);
    if (!teamId) return res.json({ campaigns: [] });
    const campaigns = await listDocs('campaigns', {
      where: [['status', '==', 'active']],
      orderBy: { field: 'startsAt', direction: 'desc' },
    });
    const now = Date.now();
    return res.json({ campaigns: campaigns.filter((campaign) => campaign.programType === 'candidate_recruitment'
      && campaign.teamIds?.includes(teamId)
      && timestampMillis(campaign.startsAt) <= now
      && (!campaign.endsAt || timestampMillis(campaign.endsAt) >= now)) });
  } catch (err) { return next(err); }
}

async function createReferral(req, res, next) {
  try {
    if (req.user.role !== 'recruiter') throw new ApiError(403, 'Campaign recruiter role required');
    const teamId = await getActiveTeamIdForUser(req.user.uid);
    if (!teamId) throw new ApiError(403, 'Ask a manager to assign you to a campaign team');
    const campaign = await getDoc('campaigns', req.body.campaignId);
    if (!campaign || campaign.programType !== 'candidate_recruitment' || campaign.status !== 'active'
      || !campaign.teamIds?.includes(teamId)
      || timestampMillis(campaign.startsAt) > Date.now()
      || (campaign.endsAt && timestampMillis(campaign.endsAt) < Date.now())) {
      throw new ApiError(403, 'This recruitment campaign is not active for your team');
    }
    const normalizedPhone = normalizeKenyanPhone(req.body.phone);
    if (!normalizedPhone) throw new ApiError(400, 'Enter a valid Kenyan mobile number');
    const id = referralDocumentId(campaign.id, normalizedPhone);
    const db = getFirestore();
    const ref = db.collection('referralRegistrations').doc(id);
    const data = {
      id,
      campaignId: campaign.id,
      teamId,
      recruiterId: req.user.uid,
      createdBy: req.user.uid,
      applicantName: req.body.applicantName,
      phone: normalizedPhone,
      county: req.body.county,
      education: req.body.education,
      passportStatus: req.body.passportStatus,
      nitaFeeStatus: req.body.nitaFeeStatus,
      eligibleForWomenOnlyIntake: true,
      applicantConsent: true,
      applicantConsentAt: admin.firestore.FieldValue.serverTimestamp(),
      consentTextVersion: 'recruitment-referral-v1',
      status: 'submitted',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await ref.create(data);
    } catch (error) {
      if (error.code === 6 || error.code === 'already-exists') {
        throw new ApiError(409, 'This applicant is already registered for this campaign. Ask a manager to review the existing referral.');
      }
      throw error;
    }
    const saved = await ref.get();
    return res.status(201).json({ referral: { id, ...saved.data(), ...commissionInfo(data, campaign) } });
  } catch (err) { return next(err); }
}

async function listReferrals(req, res, next) {
  try {
    const { role, uid, teamIds = [] } = req.user;
    let referrals;
    if (role === 'recruiter') {
      referrals = await listDocs('referralRegistrations', { where: [['recruiterId', '==', uid]], limit: 1000 });
    } else if (role === 'team_leader') {
      referrals = (await Promise.all(teamIds.map((teamId) => listDocs('referralRegistrations', { where: [['teamId', '==', teamId]], limit: 1000 })))).flat();
    } else if (role === 'manager') {
      referrals = await listDocs('referralRegistrations', {
        ...(req.query.campaignId ? { where: [['campaignId', '==', req.query.campaignId]] } : {}),
        limit: 2000,
      });
    } else {
      throw new ApiError(403, 'Campaign recruiter or manager role required');
    }
    if (req.query.campaignId && role !== 'manager') referrals = referrals.filter((item) => item.campaignId === req.query.campaignId);
    if (req.query.teamId) referrals = referrals.filter((item) => item.teamId === req.query.teamId);
    if (req.query.recruiterId && role !== 'recruiter') referrals = referrals.filter((item) => item.recruiterId === req.query.recruiterId);
    if (req.query.status) referrals = referrals.filter((item) => item.status === req.query.status);
    const campaignIds = [...new Set(referrals.map((item) => item.campaignId))];
    const campaigns = await Promise.all(campaignIds.map((id) => getDoc('campaigns', id)));
    const campaignById = new Map(campaigns.filter(Boolean).map((campaign) => [campaign.id, campaign]));
    referrals.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
    let enriched = referrals.map((item) => ({
      ...item,
      ...commissionInfo(item, campaignById.get(item.campaignId)),
      campaignName: campaignById.get(item.campaignId)?.name || 'Recruitment campaign',
    }));
    if (req.query.payoutStatus) enriched = enriched.filter((item) => item.payoutStatus === req.query.payoutStatus);
    return res.json({ referrals: enriched });
  } catch (err) { return next(err); }
}

async function getReferral(req, res, next) {
  try {
    const referral = await getDoc('referralRegistrations', req.params.id);
    if (!referral) throw new ApiError(404, 'Applicant registration not found');
    if (!canReadReferral(req.user, referral)) throw new ApiError(403, 'You cannot view this applicant registration');
    const [campaign, events] = await Promise.all([
      getDoc('campaigns', referral.campaignId),
      listDocs('referralRegistrationEvents', { where: [['registrationId', '==', referral.id]], limit: 100 }),
    ]);
    events.sort((a, b) => timestampMillis(a.createdAt) - timestampMillis(b.createdAt));
    return res.json({ referral: { ...referral, ...commissionInfo(referral, campaign) }, events });
  } catch (err) { return next(err); }
}

async function updateReferralStatus(req, res, next) {
  try {
    const db = getFirestore();
    const referralRef = db.collection('referralRegistrations').doc(req.params.id);
    const eventRef = db.collection('referralRegistrationEvents').doc();
    const outcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(referralRef);
      if (!snapshot.exists) throw new ApiError(404, 'Applicant registration not found');
      const referral = { id: snapshot.id, ...snapshot.data() };
      if (!canReadReferral(req.user, referral) || req.user.role === 'recruiter') {
        throw new ApiError(403, 'Only a manager or the applicant’s team leader can review this registration');
      }
      if (!canTransitionReferralStatus(referral.status, req.body.status)) {
        throw new ApiError(409, `Cannot move an applicant from ${referral.status} to ${req.body.status}`);
      }
      transaction.update(referralRef, {
        status: req.body.status,
        reviewNote: req.body.note || null,
        reviewedBy: req.user.uid,
        reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.create(eventRef, {
        registrationId: referral.id,
        actorId: req.user.uid,
        action: 'status_changed',
        fromStatus: referral.status,
        toStatus: req.body.status,
        note: req.body.note || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ...referral, status: req.body.status };
    });
    const campaign = await getDoc('campaigns', outcome.campaignId);
    return res.json({ referral: { ...outcome, ...commissionInfo(outcome, campaign) } });
  } catch (err) { return next(err); }
}

async function markReferralPaid(req, res, next) {
  try {
    if (req.user.role !== 'manager') throw new ApiError(403, 'Manager role required to record a commission payment');
    const db = getFirestore();
    const referralRef = db.collection('referralRegistrations').doc(req.params.id);
    const eventRef = db.collection('referralRegistrationEvents').doc();
    const paid = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(referralRef);
      if (!snapshot.exists) throw new ApiError(404, 'Applicant registration not found');
      const referral = { id: snapshot.id, ...snapshot.data() };
      const campaignRef = db.collection('campaigns').doc(referral.campaignId);
      const campaignSnapshot = await transaction.get(campaignRef);
      const campaign = campaignSnapshot.exists ? { id: campaignSnapshot.id, ...campaignSnapshot.data() } : null;
      const info = commissionInfo(referral, campaign);
      if (!info.commissionConfigured || !info.commissionEligible) throw new ApiError(409, 'This referral is not eligible for a configured commission yet');
      if (referral.paidAt) throw new ApiError(409, 'A commission payment is already recorded for this referral');
      transaction.update(referralRef, {
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidBy: req.user.uid,
        paymentReference: req.body.paymentReference,
        paymentAmountKsh: info.commissionAmountKsh,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.create(eventRef, {
        registrationId: referral.id,
        actorId: req.user.uid,
        action: 'commission_paid',
        amountKsh: info.commissionAmountKsh,
        paymentReference: req.body.paymentReference,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ...referral, paidBy: req.user.uid, paymentReference: req.body.paymentReference, paymentAmountKsh: info.commissionAmountKsh };
    });
    return res.json({ referral: { ...paid, payoutStatus: 'paid' } });
  } catch (err) { return next(err); }
}

async function getRecruiterSummary(req, res, next) {
  try {
    const role = req.user.role;
    let referrals;
    if (role === 'recruiter') {
      referrals = await listDocs('referralRegistrations', { where: [['recruiterId', '==', req.user.uid]], limit: 2000 });
    } else if (role === 'manager') {
      referrals = await listDocs('referralRegistrations', { limit: 5000 });
    } else {
      throw new ApiError(403, 'Campaign recruiter or manager role required');
    }
    const statuses = ['submitted', 'contacted', 'requirements_checked', 'training_scheduled', 'placed', 'rejected'];
    const campaigns = await Promise.all([...new Set(referrals.map((item) => item.campaignId))].map((id) => getDoc('campaigns', id)));
    const campaignById = new Map(campaigns.filter(Boolean).map((campaign) => [campaign.id, campaign]));
    const counts = Object.fromEntries(statuses.map((status) => [status, referrals.filter((item) => item.status === status).length]));
    const dueKsh = referrals.reduce((total, referral) => {
      if (referral.paidAt) return total;
      const info = commissionInfo(referral, campaignById.get(referral.campaignId));
      return total + (info.commissionEligible ? info.commissionAmountKsh : 0);
    }, 0);
    const notConfigured = referrals.some((referral) => !commissionInfo(referral, campaignById.get(referral.campaignId)).commissionConfigured);
    return res.json({ summary: { total: referrals.length, counts, dueKsh, commissionRuleMissing: notConfigured } });
  } catch (err) { return next(err); }
}

module.exports = {
  availableCampaigns,
  createReferral,
  listReferrals,
  getReferral,
  updateReferralStatus,
  markReferralPaid,
  getRecruiterSummary,
};
