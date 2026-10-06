import { collection, doc, query, where, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen } from './firestoreHelpers';

const col = collection(db, 'notifications');

export const subscribeNotifications = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const markAsRead = (id) => updateDoc(doc(db, 'notifications', id), { read: true });

export async function markAllAsRead(notifications) {
  const unread = notifications.filter((n) => !n.read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
  await batch.commit();
}

export const deleteNotification = (id) => deleteDoc(doc(db, 'notifications', id));
