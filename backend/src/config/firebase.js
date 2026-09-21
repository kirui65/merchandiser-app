const admin = require('firebase-admin');
const env = require('./env');

let app;

function initFirebase() {
  if (app) return app;

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
    storageBucket: env.firebase.storageBucket,
  });

  return app;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

function getStorageBucket() {
  initFirebase();
  return admin.storage().bucket(env.firebase.storageBucket);
}

module.exports = { admin, initFirebase, getFirestore, getStorageBucket };
