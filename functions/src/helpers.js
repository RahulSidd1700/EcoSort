import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError } from 'firebase-functions/v2/https';
import { DEFAULT_REWARDS, REGION } from './constants.js';

// Must run before any onCall() is defined; every handler imports this module first.
setGlobalOptions({ region: REGION, maxInstances: 10 });

if (!getApps().length) initializeApp();

export const db = getFirestore();
export { FieldValue, Timestamp };

/** Throws if the caller is not signed in. Returns the caller uid. */
export function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please log in to continue.');
  }
  return request.auth.uid;
}

/**
 * Loads the caller's profile from Firestore and checks the role.
 * Roles are stored in users/{uid}.role and can only be changed server-side.
 */
export async function requireRole(request, roles) {
  const uid = requireAuth(request);
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new HttpsError('permission-denied', 'User profile not found.');
  const profile = { id: snap.id, ...snap.data() };
  if (profile.active === false) throw new HttpsError('permission-denied', 'Your account is deactivated.');
  if (roles && !roles.includes(profile.role)) {
    throw new HttpsError('permission-denied', 'You are not allowed to perform this action.');
  }
  return profile;
}

export function requireString(value, field, max = 500) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  if (value.length > max) throw new HttpsError('invalid-argument', `${field} is too long.`);
  return value.trim();
}

export async function getRewardSettings() {
  const snap = await db.collection('settings').doc('rewards').get();
  return { ...DEFAULT_REWARDS, ...(snap.exists ? snap.data() : {}) };
}

/** Adds a notification write to a transaction or batch. */
export function addNotification(writer, { userId, title, message, type = 'info', link = '' }) {
  const ref = db.collection('notifications').doc();
  writer.set(ref, {
    userId,
    title,
    message,
    type,
    link,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Awards EcoPoints exactly once.
 * The reward document ID is deterministic (e.g. PICKUP_<pickupId>), so even if
 * the same event is processed twice, the second attempt finds the existing
 * document and does nothing. Must be called inside a transaction AFTER the
 * reward document has been read (Firestore requires reads before writes).
 */
export function awardPointsInTransaction(tx, rewardSnap, { userId, action, points, referenceId, label }) {
  if (rewardSnap.exists || !points || points <= 0) return false;
  tx.set(rewardSnap.ref, {
    rewardId: rewardSnap.id,
    userId,
    action,
    points,
    referenceId,
    label,
    createdAt: FieldValue.serverTimestamp(),
  });
  tx.set(db.collection('users').doc(userId), { ecoPoints: FieldValue.increment(points) }, { merge: true });
  addNotification(tx, {
    userId,
    title: 'EcoPoints earned',
    message: `You earned ${points} EcoPoints. ${label}`,
    type: 'reward',
    link: '/eco-points',
  });
  return true;
}

/** History entry stored inside documents (serverTimestamp is not allowed inside arrays). */
export function historyEntry(status, by, note = '') {
  return { status, at: Timestamp.now(), byId: by.id, byName: by.name || 'System', byRole: by.role || '', note };
}
