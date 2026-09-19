/**
 * localId-based idempotency for offline syncs.
 *
 * The mobile client generates a UUID (`localId`) client-side at the moment
 * a sale is entered, before it knows whether it's online. On sync, the same
 * `localId` may be POSTed more than once (dropped ack, retried request,
 * duplicate background sync trigger). The rule: a duplicate `localId` for
 * the same rep is NOT an error — it returns the existing record so the
 * mobile sync manager can safely mark the item `synced` either way.
 */

const { getFirestore } = require('../config/firebase');

/**
 * Look up an existing sale by (repId, localId).
 * @returns {Promise<object|null>} the existing sale doc (with id), or null
 */
async function findExistingSaleByLocalId(repId, localId) {
  const db = getFirestore();
  const snap = await db
    .collection('sales')
    .where('repId', '==', repId)
    .where('localId', '==', localId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

module.exports = { findExistingSaleByLocalId };
