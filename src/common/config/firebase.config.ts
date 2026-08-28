import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import * as path from 'path';
import * as fs from 'fs';

let firebaseApp: App | null = null;

export const initFirebase = (): App | null => {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  try {
    const serviceAccountPath =
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      path.join(process.cwd(), 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccountPath),
      });
      console.log('[Firebase] Admin SDK initialized from service account JSON.');
    } else if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = initializeApp();
      console.log('[Firebase] Admin SDK initialized from environment credentials.');
    } else {
      console.warn(
        '[Firebase] Warning: Chưa tìm thấy firebase-service-account.json hoặc GOOGLE_APPLICATION_CREDENTIALS. Push Notification sẽ ở chế độ Mock / Disabled.'
      );
    }
  } catch (error) {
    console.error('[Firebase] Init error:', error);
  }

  return firebaseApp;
};

export const getFirebaseMessaging = (): Messaging | null => {
  const app = initFirebase();
  if (!app) return null;
  return getMessaging(app);
};

