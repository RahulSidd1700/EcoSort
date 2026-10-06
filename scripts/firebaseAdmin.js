// Shared Firebase Admin initialisation for the development scripts.
// Usage flags:  --emulator   use the local Emulator Suite (recommended for development)
// For a real project, authenticate with `gcloud auth application-default login`
// or set GOOGLE_APPLICATION_CREDENTIALS to a service-account file that is NOT committed to git.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const args = process.argv.slice(2);
export const useEmulator = args.includes('--emulator');

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
}

function defaultProjectId() {
  try {
    return JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url))).projects.default;
  } catch {
    return undefined;
  }
}

export const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || defaultProjectId();

initializeApp({ projectId });

export const db = getFirestore();
export const auth = getAuth();
export { FieldValue, Timestamp };
