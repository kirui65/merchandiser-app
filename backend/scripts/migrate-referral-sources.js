/*
 * One-time production migration for referral registrations created before
 * source attribution existed. Run with production Firebase credentials:
 *   npm run migrate:referral-sources
 * It deliberately prints only aggregate counts, never applicant data.
 */
const { getFirestore } = require('../src/config/firebase');

async function run() {
  const db = getFirestore();
  let updated = 0;
  let last = null;
  do {
    let query = db.collection('referralRegistrations').orderBy('__name__').limit(400);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    let batchUpdated = 0;
    snapshot.docs.forEach((doc) => {
      if (!doc.get('source')) {
        batch.update(doc.ref, { source: 'recruiter_app' });
        updated += 1;
        batchUpdated += 1;
      }
    });
    if (batchUpdated) await batch.commit();
    last = snapshot.docs[snapshot.docs.length - 1];
  } while (last);
  // eslint-disable-next-line no-console
  console.log(`Referral source migration complete: ${updated} record(s) updated.`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Referral source migration failed:', error.message);
  process.exitCode = 1;
});
