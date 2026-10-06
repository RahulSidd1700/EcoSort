import { collection, doc, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen } from './firestoreHelpers';

const col = collection(db, 'partners');

export const subscribeActivePartners = (onData, onError) =>
  listen(query(col, where('active', '==', true)), onData, onError);

export const subscribeAllPartners = (onData, onError) => listen(col, onData, onError);

export async function savePartner(id, data) {
  const ref = id ? doc(db, 'partners', id) : doc(col);
  await setDoc(
    ref,
    {
      name: data.name.trim(),
      type: data.type,
      categories: data.categories || [],
      serviceArea: (data.serviceArea || '').trim(),
      phone: (data.phone || '').trim(),
      email: (data.email || '').trim(),
      address: (data.address || '').trim(),
      active: Boolean(data.active),
      updatedAt: serverTimestamp(),
      ...(id ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  return ref.id;
}

export const deletePartner = (id) => deleteDoc(doc(db, 'partners', id));
