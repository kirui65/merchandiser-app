const { getFirestore } = require('../config/firebase');
const { ApiError } = require('../middleware/errorHandler');

async function getActiveTeamIdForUser(uid, firestore = getFirestore()) {
  const memberships = await firestore.collection('teamMemberships')
    .where('repId', '==', uid)
    .where('status', '==', 'active')
    .get();

  const activeMemberships = memberships.docs.filter((membership) => membership.data().teamId);
  const activeTeams = await Promise.all(activeMemberships.map(async (membership) => {
    const team = await firestore.collection('teams').doc(membership.data().teamId).get();
    return team.exists && team.data().active === true ? team.id : null;
  }));
  const teamIds = [...new Set(activeTeams.filter(Boolean))];

  if (teamIds.length > 1) {
    throw new ApiError(409, 'User has multiple active team memberships; resolve the memberships before recording field data');
  }
  return teamIds[0] || null;
}

module.exports = { getActiveTeamIdForUser };
