const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getMessaging: getAdminMessaging } = require('firebase-admin/messaging');
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_SERVICE_ACCOUNT_PATH,
  FIREBASE_SERVICE_ACCOUNT_BASE64,
  FCM_DEV_MODE,
} = require('./env.config');

let firebaseApp = null;
let isMockMode = false;

/**
 * Clean and format RSA private key (handles literal \n characters from env)
 */
const formatPrivateKey = (key) => {
  if (!key) return undefined;
  let formatted = key.trim().replace(/^["']|["']$/g, '');
  if (formatted.includes('\\n')) {
    formatted = formatted.replace(/\\n/g, '\n');
  }
  return formatted;
};

/**
 * Initialize Firebase Admin SDK safely (Singleton)
 * Supports:
 * 1. Service account JSON file path (FIREBASE_SERVICE_ACCOUNT_PATH)
 * 2. Base64 encoded service account JSON (FIREBASE_SERVICE_ACCOUNT_BASE64)
 * 3. Environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 4. Safe fallback / Mock mode for development, tests, or when credentials are not yet configured
 */
const initFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps && existingApps.length > 0) {
    firebaseApp = getApp();
    return firebaseApp;
  }

  try {
    let credential = null;

    // 1. Check Service Account File Path
    if (FIREBASE_SERVICE_ACCOUNT_PATH) {
      const resolvedPath = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT_PATH)
        ? FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(process.cwd(), FIREBASE_SERVICE_ACCOUNT_PATH);

      if (fs.existsSync(resolvedPath)) {
        credential = cert(resolvedPath);
        console.log(`[Firebase Admin]: Initialized using service account file at: ${resolvedPath}`);
      } else {
        console.warn(`[Firebase Admin]: Service account file not found at: ${resolvedPath}`);
      }
    }

    // 2. Check Base64 Encoded Service Account
    if (!credential && FIREBASE_SERVICE_ACCOUNT_BASE64) {
      try {
        const jsonStr = Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(jsonStr);
        credential = cert(serviceAccount);
        console.log('[Firebase Admin]: Initialized using base64 service account credential');
      } catch (b64Err) {
        console.warn('[Firebase Admin]: Failed to parse base64 service account credential:', b64Err.message);
      }
    }

    // 3. Check Individual Environment Variables
    if (!credential && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      const formattedKey = formatPrivateKey(FIREBASE_PRIVATE_KEY);
      credential = cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      });
      console.log(`[Firebase Admin]: Initialized using environment credentials for project: ${FIREBASE_PROJECT_ID || 'unspecified'}`);
    }

    // 4. Initialize if credential resolved
    if (credential) {
      firebaseApp = initializeApp({
        credential,
        projectId: FIREBASE_PROJECT_ID || undefined,
      });
      isMockMode = false;
      return firebaseApp;
    }

    // 5. Fallback Mock / Dev Mode
    isMockMode = true;
    console.warn(
      '[Firebase Admin]: No Firebase credentials found. FCM will run in MOCK / DRY-RUN mode. Push notifications will be logged but not delivered to real devices.'
    );
    return null;
  } catch (error) {
    isMockMode = true;
    console.error('[Firebase Admin Initialization Error]:', error.message);
    console.warn('[Firebase Admin]: Defaulting to MOCK / DRY-RUN mode so application can continue safely.');
    return null;
  }
};

/**
 * Get initialized Firebase Messaging instance or null in mock mode
 */
const getMessaging = () => {
  const app = initFirebase();
  if (!app || isMockMode) {
    return null;
  }
  return getAdminMessaging(app);
};

/**
 * Returns whether Firebase Admin is running with real credentials
 */
const isFirebaseReady = () => {
  initFirebase();
  return !isMockMode && !!firebaseApp;
};

module.exports = {
  initFirebase,
  getMessaging,
  isFirebaseReady,
  formatPrivateKey,
};
