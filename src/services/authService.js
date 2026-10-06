import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

/** Registers a new account. Every self-registered account gets the USER role. */
export async function register({ name, email, phone, password, address, area }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateAuthProfile(cred.user, { displayName: name.trim() });
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    name: name.trim(),
    email: cred.user.email,
    phone: phone.trim(),
    address: address.trim(),
    area: (area || '').trim(),
    role: 'user',
    ecoPoints: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);

export const logout = () => signOut(auth);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

export function updateProfileInfo(uid, { name, phone, address, area }) {
  return updateDoc(doc(db, 'users', uid), {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    area: (area || '').trim(),
    updatedAt: serverTimestamp(),
  });
}
