// Firebase initialisation. Values come from .env (VITE_FIREBASE_*).
// The web config only identifies the project - it is not a secret.
// AI API keys are NEVER placed here; they live in Cloud Functions secrets.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
const firebaseWebApiKey = import.meta.env.VITE_FIREBASE_WEB_KEY || import.meta.env.VITE_FIREBASE_API_KEY;

export const firebaseConfig = {
  apiKey: firebaseWebApiKey || (useEmulators ? 'demo-api-key' : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useEmulators ? 'demo-ecosort' : undefined),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = initializeApp(isFirebaseConfigured ? firebaseConfig : { apiKey: 'missing', projectId: 'missing' });
export const auth = getAuth(app);
// Long polling avoids browser/network QUIC failures that can leave auth profiles
// stuck in the loading state when Firestore's WebChannel transport is blocked.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const functions = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || 'asia-south1');

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
