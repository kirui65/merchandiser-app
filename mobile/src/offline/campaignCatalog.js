import { getDb } from './db';

export function cacheCampaigns(ownerId, campaigns) {
  const db = getDb();
  const cachedAt = new Date().toISOString();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM campaign_catalog WHERE ownerId = ?;', [ownerId]);
    for (const campaign of campaigns) {
      db.runSync(
        'INSERT INTO campaign_catalog (ownerId, id, payload, cachedAt) VALUES (?, ?, ?, ?);',
        [ownerId, campaign.id, JSON.stringify(campaign), cachedAt],
      );
    }
  });
}

export function getCachedCampaigns(ownerId) {
  return getDb()
    .getAllSync('SELECT payload FROM campaign_catalog WHERE ownerId = ? ORDER BY id ASC;', [ownerId])
    .map((row) => JSON.parse(row.payload));
}
