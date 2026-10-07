const { listDocs } = require('./firestore.service');

async function listTeamDocs(collection, teamIds, options = {}) {
  if (!Array.isArray(teamIds) || teamIds.length === 0) return [];
  const pages = await Promise.all(teamIds.map((teamId) => listDocs(collection, {
    ...options,
    where: [...(options.where || []), ['teamId', '==', teamId]],
  })));
  return pages.flat();
}

module.exports = { listTeamDocs };
