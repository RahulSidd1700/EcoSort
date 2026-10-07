import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { collection, doc, serverTimestamp, setDoc, updateDoc, orderBy, query, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfig, useEmulators } from '../firebase/config';
import { listen, listenDoc } from './firestoreHelpers';

// ----- Users -----
export const subscribeUsers = (onData, onError) =>
  listen(query(collection(db, 'users'), orderBy('createdAt', 'desc')), onData, onError);

export async function setUserActive(uid, active) {
  if (auth.currentUser?.uid === uid) throw new Error('You cannot deactivate your own account.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'collectors', uid), { active }, { merge: true });
  await batch.commit();
}

// ----- Collectors -----
export const subscribeCollectors = (onData, onError) => listen(collection(db, 'collectors'), onData, onError);

export const subscribeCollectorProfile = (uid, onData, onError) =>
  listenDoc(doc(db, 'collectors', uid), onData, onError);

export async function createCollector(data) {
  const appName = 'collector-account-creator';
  const creatorApp = getApps().find((candidate) => candidate.name === appName) || initializeApp(firebaseConfig, appName);
  const creatorAuth = getAuth(creatorApp);
  if (useEmulators && !creatorAuth.emulatorConfig) {
    connectAuthEmulator(creatorAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  const email = data.email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(creatorAuth, email, data.password);
  await updateProfile(credential.user, { displayName: data.name.trim() });
  const serviceAreas = String(data.serviceAreas || '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)
    .slice(0, 20);
  const profile = {
    uid: credential.user.uid,
    name: data.name.trim(),
    email,
    phone: data.phone.trim(),
    address: '',
    area: serviceAreas[0] || '',
    role: 'collector',
    ecoPoints: 0,
    active: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', credential.user.uid), profile);
  await setDoc(doc(db, 'collectors', credential.user.uid), {
    uid: credential.user.uid,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    serviceAreas,
    available: true,
    active: true,
    createdAt: serverTimestamp(),
  });
  return { success: true, uid: credential.user.uid };
}

export const updateCollector = (uid, data) => updateDoc(doc(db, 'collectors', uid), data);

// ----- Settings (rewards | rates | impact) -----
export const subscribeSetting = (id, onData, onError) => listenDoc(doc(db, 'settings', id), onData, onError);

export const saveSetting = (id, data) => setDoc(doc(db, 'settings', id), data, { merge: true });

// ----- Categories -----
export const subscribeCategories = (onData, onError) => listen(collection(db, 'categories'), onData, onError);

export const saveCategory = (id, data) => setDoc(doc(db, 'categories', id), data, { merge: true });
