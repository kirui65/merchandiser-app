const { getFirestore, admin } = require('../config/firebase');

/**
 * Thin generic CRUD helpers over Firestore. Kept deliberately dumb —
 * authorization and business rules belong in controllers/services that
 * call this, not here.
 */

function collection(name) {
  return getFirestore().collection(name);
}

async function createDoc(collectionName, data) {
  const ref = collection(collectionName).doc();
  const payload = { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.set(payload);
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() };
}

async function getDoc(collectionName, id) {
  const snap = await collection(collectionName).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function updateDoc(collectionName, id, data) {
  await collection(collectionName).doc(id).update(data);
  return getDoc(collectionName, id);
}

async function deleteDoc(collectionName, id) {
  await collection(collectionName).doc(id).delete();
}

async function listDocs(collectionName, { where = [], orderBy = null, limit = null } = {}) {
  let query = collection(collectionName);
  for (const [field, op, value] of where) {
    query = query.where(field, op, value);
  }
  if (orderBy) query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
  if (limit) query = query.limit(limit);

  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { collection, createDoc, getDoc, updateDoc, deleteDoc, listDocs };
