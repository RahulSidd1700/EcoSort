import { onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const mapDoc = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) });

/** Real-time listener for a query. Returns the unsubscribe function. */
export function listen(q, onData, onError) {
  return onSnapshot(q, (snap) => onData(snap.docs.map(mapDoc)), onError);
}

/** Real-time listener for one document (null when missing). */
export function listenDoc(ref, onData, onError) {
  return onSnapshot(ref, (snap) => onData(snap.exists() ? mapDoc(snap) : null), onError);
}

/** Calls a Cloud Function by name and returns its data. */
export async function callFunction(name, payload) {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
}
