import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { db, FieldValue, requireRole, requireString } from '../helpers.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * createCollectorAccount({ name, email, phone, password, serviceAreas })
 * Admin creates collector/recycler accounts. The password is chosen by the
 * admin and shared privately with the collector; it is never stored in Firestore.
 */
export const createCollectorAccount = onCall(async (request) => {
  await requireRole(request, ['admin']);
  const name = requireString(request.data?.name, 'Name', 100);
  const email = requireString(request.data?.email, 'Email', 150).toLowerCase();
  const phone = requireString(request.data?.phone, 'Phone', 20);
  const password = requireString(request.data?.password, 'Password', 100);
  const serviceAreas = String(request.data?.serviceAreas || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!EMAIL_RE.test(email)) throw new HttpsError('invalid-argument', 'Please enter a valid email.');
  if (password.length < 6) throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');

  let user;
  try {
    user = await getAuth().createUser({ email, password, displayName: name });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', 'Could not create the collector account.');
  }

  const batch = db.batch();
  batch.set(db.collection('users').doc(user.uid), {
    uid: user.uid,
    name,
    email,
    phone,
    address: '',
    area: serviceAreas[0] || '',
    role: 'collector',
    ecoPoints: 0,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('collectors').doc(user.uid), {
    uid: user.uid,
    name,
    email,
    phone,
    serviceAreas,
    available: true,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { success: true, uid: user.uid };
});

/** setUserActive({ uid, active }) - activates/deactivates an account (Auth + Firestore). */
export const setUserActive = onCall(async (request) => {
  const admin = await requireRole(request, ['admin']);
  const uid = requireString(request.data?.uid, 'uid', 128);
  const active = request.data?.active === true;
  if (uid === admin.id) throw new HttpsError('failed-precondition', 'You cannot deactivate your own account.');

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.');

  try {
    await getAuth().updateUser(uid, { disabled: !active });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw new HttpsError('internal', 'Could not update the account.');
  }
  const batch = db.batch();
  batch.update(userRef, { active, updatedAt: FieldValue.serverTimestamp() });
  if (snap.data().role === 'collector') {
    batch.set(db.collection('collectors').doc(uid), { active }, { merge: true });
  }
  await batch.commit();
  return { success: true };
});
