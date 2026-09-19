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
  });

  return app;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

module.exports = { admin, initFirebase, getFirestore };
