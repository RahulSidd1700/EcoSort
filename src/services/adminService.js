import { collection, doc, setDoc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen, listenDoc, callFunction } from './firestoreHelpers';

// ----- Users -----
export const subscribeUsers = (onData, onError) =>
  listen(query(collection(db, 'users'), orderBy('createdAt', 'desc')), onData, onError);

export const setUserActive = (uid, active) => callFunction('setUserActive', { uid, active });

// ----- Collectors -----
export const subscribeCollectors = (onData, onError) => listen(collection(db, 'collectors'), onData, onError);

export const subscribeCollectorProfile = (uid, onData, onError) =>
  listenDoc(doc(db, 'collectors', uid), onData, onError);

export const createCollector = (data) => callFunction('createCollectorAccount', data);

export const updateCollector = (uid, data) => updateDoc(doc(db, 'collectors', uid), data);

// ----- Settings (rewards | rates | impact) -----
export const subscribeSetting = (id, onData, onError) => listenDoc(doc(db, 'settings', id), onData, onError);

export const saveSetting = (id, data) => setDoc(doc(db, 'settings', id), data, { merge: true });

// ----- Categories -----
export const subscribeCategories = (onData, onError) => listen(collection(db, 'categories'), onData, onError);

export const saveCategory = (id, data) => setDoc(doc(db, 'categories', id), data, { merge: true });
