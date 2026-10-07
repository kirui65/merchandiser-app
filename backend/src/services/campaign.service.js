const { getDoc } = require('./firestore.service');
const { ApiError } = require('../middleware/errorHandler');

function isCampaignAssignedToTeam(campaign, teamId) {
  return Boolean(campaign && typeof teamId === 'string' && campaign.teamIds?.includes(teamId));
}

async function assertCampaignForTeam(campaignId, teamId) {
  if (!campaignId) return null;
  if (!teamId) throw new ApiError(400, 'A team membership is required to attribute this record to a campaign');
  const campaign = await getDoc('campaigns', campaignId);
  if (!isCampaignAssignedToTeam(campaign, teamId)) {
    throw new ApiError(400, 'Campaign is not assigned to your team');
  }
  return campaign;
}

module.exports = { isCampaignAssignedToTeam, assertCampaignForTeam };
