const { getFirestore, admin } = require('../config/firebase');
const { createDoc, getDoc, listDocs, updateDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');

const ASSIGNABLE_ROLES = ['rep', 'telemarketer', 'brand_ambassador'];

async function validateTeamReferences({ teamLeaderId, regionId }) {
  if (teamLeaderId) {
    const leader = await getDoc('reps', teamLeaderId);
    if (!leader || leader.active === false || leader.role !== 'team_leader') {
      throw new ApiError(400, 'teamLeaderId must reference an active team leader');
    }
  }
  if (regionId) {
    const region = await getDoc('regions', regionId);
    if (!region || region.active === false) throw new ApiError(400, 'regionId must reference an active region');
  }
}

async function listTeams(req, res, next) {
  try {
    const teams = await listDocs('teams', { orderBy: { field: 'name', direction: 'asc' } });
    return res.json({ teams });
  } catch (err) {
    return next(err);
  }
}

async function createTeam(req, res, next) {
  try {
    await validateTeamReferences(req.body);
    const team = await createDoc('teams', {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ team });
  } catch (err) {
    return next(err);
  }
}

async function updateTeam(req, res, next) {
  try {
    const existing = await getDoc('teams', req.params.id);
    if (!existing) throw new ApiError(404, 'Team not found');
    await validateTeamReferences({
      ...(req.body.teamLeaderId && req.body.teamLeaderId !== existing.teamLeaderId
        ? { teamLeaderId: req.body.teamLeaderId }
        : {}),
      ...(req.body.regionId && req.body.regionId !== existing.regionId
        ? { regionId: req.body.regionId }
        : {}),
    });
    const team = await updateDoc('teams', req.params.id, {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ team });
  } catch (err) {
    return next(err);
  }
}

async function deactivateTeam(req, res, next) {
  try {
    const existing = await getDoc('teams', req.params.id);
    if (!existing) throw new ApiError(404, 'Team not found');
    const team = await updateDoc('teams', req.params.id, {
      active: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ team });
  } catch (err) {
    return next(err);
  }
}

async function listRegions(req, res, next) {
  try {
    const regions = await listDocs('regions', { orderBy: { field: 'name', direction: 'asc' } });
    return res.json({ regions });
  } catch (err) {
    return next(err);
  }
}

async function createRegion(req, res, next) {
  try {
    const region = await createDoc('regions', {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(201).json({ region });
  } catch (err) {
    return next(err);
  }
}

async function updateRegion(req, res, next) {
  try {
    const existing = await getDoc('regions', req.params.id);
    if (!existing) throw new ApiError(404, 'Region not found');
    const region = await updateDoc('regions', req.params.id, {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ region });
  } catch (err) {
    return next(err);
  }
}

async function deactivateRegion(req, res, next) {
  try {
    const existing = await getDoc('regions', req.params.id);
    if (!existing) throw new ApiError(404, 'Region not found');
    const region = await updateDoc('regions', req.params.id, {
      active: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.json({ region });
  } catch (err) {
    return next(err);
  }
}

async function listMemberships(req, res, next) {
  try {
    const memberships = await listDocs('teamMemberships');
    const filtered = memberships.filter((membership) =>
      (!req.query.teamId || membership.teamId === req.query.teamId)
      && (!req.query.repId || membership.repId === req.query.repId));
    return res.json({ memberships: filtered });
  } catch (err) {
    return next(err);
  }
}

async function createMembership(req, res, next) {
  try {
    const { teamId, repId } = req.body;
    const [team, rep] = await Promise.all([getDoc('teams', teamId), getDoc('reps', repId)]);
    if (!team || team.active !== true) throw new ApiError(400, 'Membership must reference an active team');
    if (!rep || rep.active === false || !ASSIGNABLE_ROLES.includes(rep.role)) {
      throw new ApiError(400, 'repId must reference an active field representative');
    }

    const db = getFirestore();
    const membershipId = `${teamId}_${repId}`;
    const membershipRef = db.collection('teamMemberships').doc(membershipId);
    const activeMembershipQuery = db.collection('teamMemberships')
      .where('repId', '==', repId)
      .where('status', '==', 'active');
    const duplicate = await db.runTransaction(async (transaction) => {
      const [existing, activeMemberships, currentTeam, currentRep] = await Promise.all([
        transaction.get(membershipRef),
        transaction.get(activeMembershipQuery),
        transaction.get(db.collection('teams').doc(teamId)),
        transaction.get(db.collection('reps').doc(repId)),
      ]);
      if (!currentTeam.exists || currentTeam.data().active !== true
        || !currentRep.exists || currentRep.data().active === false
        || !ASSIGNABLE_ROLES.includes(currentRep.data().role)) {
        throw new ApiError(409, 'The team or field user is no longer active');
      }
      if (activeMemberships.docs.some((doc) => doc.id !== membershipId)) {
        throw new ApiError(409, 'This user already has an active team membership; end it before reassigning');
      }
      if (existing.exists && existing.data().status === 'active') return true;
      const now = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(membershipRef, {
        id: membershipId,
        teamId,
        repId,
        status: 'active',
        startedAt: now,
        endedAt: null,
        createdAt: existing.exists ? existing.data().createdAt : now,
      });
      return false;
    });
    const saved = await membershipRef.get();
    return res.status(duplicate ? 200 : 201).json({ membership: { id: saved.id, ...saved.data() }, duplicate });
  } catch (err) {
    return next(err);
  }
}

async function updateMembership(req, res, next) {
  try {
    const db = getFirestore();
    const ref = db.collection('teamMemberships').doc(req.params.id);
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists) throw new ApiError(404, 'Team membership not found');
      const current = existing.data();
      if (req.body.status === 'active') {
        const [team, rep, others] = await Promise.all([
          transaction.get(db.collection('teams').doc(current.teamId)),
          transaction.get(db.collection('reps').doc(current.repId)),
          transaction.get(db.collection('teamMemberships')
          .where('repId', '==', current.repId)
          .where('status', '==', 'active')),
        ]);
        if (!team.exists || team.data().active !== true || !rep.exists || rep.data().active === false
          || !ASSIGNABLE_ROLES.includes(rep.data().role)) {
          throw new ApiError(400, 'An active team and active field user are required to restore membership');
        }
        if (others.docs.some((doc) => doc.id !== ref.id)) {
          throw new ApiError(409, 'This user already has another active team membership');
        }
      }
      transaction.update(ref, {
        status: req.body.status,
        startedAt: req.body.status === 'active' ? admin.firestore.FieldValue.serverTimestamp() : current.startedAt,
        endedAt: req.body.status === 'ended' ? admin.firestore.FieldValue.serverTimestamp() : null,
      });
    });
    const updated = await ref.get();
    return res.json({ membership: { id: updated.id, ...updated.data() } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listTeams,
  createTeam,
  updateTeam,
  deactivateTeam,
  listRegions,
  createRegion,
  updateRegion,
  deactivateRegion,
  listMemberships,
  createMembership,
  updateMembership,
};
