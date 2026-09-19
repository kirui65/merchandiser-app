require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn(`[env] Warning: ${name} is not set`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  firebase: {
    projectId: required('FIREBASE_PROJECT_ID'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL'),
    // Render/most hosts store the key with literal \n escapes in the env var.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },

  daraja: {
    consumerKey: process.env.DARAJA_CONSUMER_KEY,
    consumerSecret: process.env.DARAJA_CONSUMER_SECRET,
    shortcode: process.env.DARAJA_SHORTCODE,
    passkey: process.env.DARAJA_PASSKEY,
    callbackUrl: process.env.DARAJA_CALLBACK_URL,
    env: process.env.DARAJA_ENV || 'sandbox',
  },

  reconciliationWindowMinutes: Number(process.env.RECONCILIATION_WINDOW_MINUTES || 15),

  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
};
