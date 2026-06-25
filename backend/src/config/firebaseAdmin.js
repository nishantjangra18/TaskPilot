const { cert, getApp, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let firebaseAdminApp = null;

const getFirebasePrivateKey = () => {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return null;
  return key.replace(/\\n/g, '\n');
};

const getFirebaseAdminApp = () => {
  if (firebaseAdminApp) return firebaseAdminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getFirebasePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }

  firebaseAdminApp = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

  return firebaseAdminApp;
};

const verifyFirebaseIdToken = async (idToken) => {
  const app = getFirebaseAdminApp();
  return getAuth(app).verifyIdToken(idToken);
};

module.exports = { verifyFirebaseIdToken };
