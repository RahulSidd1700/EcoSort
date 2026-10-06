import { collection, doc, setDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen, callFunction } from './firestoreHelpers';
import { COMPLAINT_TYPES } from '../utils/constants';

const col = collection(db, 'complaints');

export async function createComplaint(profile, data) {
  const ref = doc(col);
  await setDoc(ref, {
    complaintId: ref.id,
    userId: profile.uid,
    userName: profile.name,
    type: data.type,
    typeLabel: COMPLAINT_TYPES.find((t) => t.value === data.type)?.label || data.type,
    description: data.description.trim(),
    imageUrl: data.imageUrl || '',
    imagePath: data.imagePath || '',
    address: data.address.trim(),
    status: 'SUBMITTED',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const updateComplaintStatus = (complaintId, status, adminNote = '') =>
  callFunction('updateComplaintStatus', { complaintId, status, adminNote });

export const subscribeMyComplaints = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const subscribeAllComplaints = (onData, onError) =>
  listen(query(col, orderBy('createdAt', 'desc')), onData, onError);
