const express = require('express');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verify } = require('otplib');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { getFirestore, admin } = require('../config/firebase');
const { getDoc, listDocs } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/audit.service');
const { RESET_DELETE_COLLECTIONS, assertSystemResetConfirmation } = require('../services/accountAdministration.service');

const router = express.Router();
router.use(requireAuth, requireManager);
const destructiveActionLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

function decryptSecret(value) {
  const [iv, tag, encrypted] = String(value || '').split('.').map((part) => Buffer.from(part, 'base64url'));
  const key = crypto.createHash('sha256').update(require('../config/env').jwtSecret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function verifyManagerReauthentication(req, { mfaCode } = {}) {
  const manager = await getDoc('reps', req.user.uid);
  if (!manager || manager.active === false || manager.role !== 'manager') throw new ApiError(401, 'Manager account is not active');
  const currentPassword = String(req.body?.currentPassword || '');
  if (!currentPassword || !(await bcrypt.compare(currentPassword, manager.passwordHash))) throw new ApiError(403, 'Current password is incorrect');
  if (manager.mfaEnabled) {
    if (!mfaCode || !(await verify({ token: String(mfaCode), secret: decryptSecret(manager.mfaSecretEncrypted) })).valid) {
      throw new ApiError(401, 'A valid authenticator code is required for this manager account');
    }
  }
  return manager;
}

function emailIndexId(email) { return Buffer.from(String(email || '').trim().toLowerCase()).toString('base64url'); }

router.post('/reps/:id/delete', destructiveActionLimit, async (req, res, next) => {
  try {
    const manager = await verifyManagerReauthentication(req, req.body);
    const target = await getDoc('reps', req.params.id);
    if (!target) throw new ApiError(404, 'Account not found');
    if (String(req.body?.confirmEmail || '').trim().toLowerCase() !== String(target.email || '').trim().toLowerCase()) {
      throw new ApiError(400, 'Enter the account email exactly to confirm deletion');
    }
    const [accounts, ledTeams] = await Promise.all([
      listDocs('reps'),
      target.role === 'team_leader' ? listDocs('teams', { where: [['teamLeaderId', '==', target.id]] }) : Promise.resolve([]),
    ]);
    const activeManagers = accounts.filter((account) => account.role === 'manager' && account.active !== false).length;
    const { assertCanDeleteAccount } = require('../services/accountAdministration.service');
    assertCanDeleteAccount({ target, currentUserId: manager.id, activeManagers, ledTeams });

    const db = getFirestore();
    const repRef = db.collection('reps').doc(target.id);
    const emailRef = db.collection('repEmailIndex').doc(emailIndexId(target.email));
    const membershipQuery = db.collection('teamMemberships').where('repId', '==', target.id);
    const auditRef = db.collection('auditLog').doc();
    await db.runTransaction(async (transaction) => {
      const [repSnapshot, emailSnapshot, membershipSnapshot] = await Promise.all([
        transaction.get(repRef), transaction.get(emailRef), transaction.get(membershipQuery),
      ]);
      if (!repSnapshot.exists) throw new ApiError(404, 'Account not found');
      for (const membership of membershipSnapshot.docs) {
        if (membership.data().status === 'active') transaction.update(membership.ref, {
          status: 'ended', endedAt: admin.firestore.FieldValue.serverTimestamp(),
          endedBy: manager.id, endReason: 'account_deleted',
        });
      }
      if (emailSnapshot.exists && emailSnapshot.data().repId === target.id) transaction.delete(emailRef);
      transaction.delete(repRef);
      transaction.create(auditRef, {
        actorId: manager.id, actorRole: 'manager', action: 'account_deleted', entityType: 'rep',
        entityId: target.id, entityName: target.name, changedFields: ['account', 'sign_in_access'],
        historyRetained: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    return res.json({ message: `Sign-in account for ${target.name} was deleted. Historical activity remains attributed to the account ID.` });
  } catch (err) { return next(err); }
});

async function deleteCollectionInBatches(db, collectionName) {
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) break;
  }
  return deleted;
}

router.post('/system-reset', destructiveActionLimit, async (req, res, next) => {
  let operationRef;
  try {
    const manager = await verifyManagerReauthentication(req, req.body);
    assertSystemResetConfirmation(req.body?.confirmText);
    const db = getFirestore();
    operationRef = db.collection('systemOperations').doc('system_reset');
    const lock = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(operationRef);
      if (existing.exists && existing.data().status === 'running') throw new ApiError(409, 'A system reset is already in progress');
      transaction.set(operationRef, {
        status: 'running', startedBy: manager.id,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!lock) throw new ApiError(409, 'A system reset is already in progress');
    const counts = {};
    const allAccounts = await listDocs('reps');
    const nonManagers = allAccounts.filter((account) => account.role !== 'manager');
    counts.reps = 0;
    for (const account of nonManagers) {
      const repRef = db.collection('reps').doc(account.id);
      const emailRef = db.collection('repEmailIndex').doc(emailIndexId(account.email));
      const [repSnapshot, emailSnapshot] = await Promise.all([repRef.get(), emailRef.get()]);
      const batch = db.batch();
      if (emailSnapshot.exists && emailSnapshot.data().repId === account.id) batch.delete(emailRef);
      if (repSnapshot.exists && repSnapshot.data().role !== 'manager') batch.delete(repRef);
      await batch.commit();
      counts.reps += repSnapshot.exists ? 1 : 0;
    }
    for (const collectionName of RESET_DELETE_COLLECTIONS) counts[collectionName] = await deleteCollectionInBatches(db, collectionName);
    const outlets = await db.collection('outlets').get();
    for (let offset = 0; offset < outlets.docs.length; offset += 400) {
      const batch = db.batch();
      outlets.docs.slice(offset, offset + 400).forEach((outlet) => {
        if (outlet.data().assignedRepId) batch.update(outlet.ref, { assignedRepId: admin.firestore.FieldValue.delete() });
      });
      await batch.commit();
    }
    const audit = await recordAudit({ user: { uid: manager.id, role: 'manager' } }, {
      action: 'system_reset_completed', entityType: 'system', entity: { id: 'system', name: 'System data reset' },
      changedFields: Object.keys(counts),
    });
    await operationRef.set({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp(), counts }, { merge: true });
    return res.json({ message: 'System reset completed. Manager accounts, products, outlets, territories, regions, audit logs, and security logs were kept.', deleted: counts, auditId: audit.id });
  } catch (err) {
    if (operationRef) await operationRef.set({ status: 'failed', failedAt: admin.firestore.FieldValue.serverTimestamp(), error: err.message }, { merge: true }).catch(() => {});
    return next(err);
  }
});

module.exports = router;
