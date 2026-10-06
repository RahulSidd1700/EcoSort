import { collection, doc, setDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen, callFunction } from './firestoreHelpers';

const col = collection(db, 'pickupRequests');

/** Generates the pickup ID up-front, so a double-click cannot create two requests. */
export const newPickupId = () => doc(col).id;

export async function createPickup(pickupId, profile, data) {
  await setDoc(doc(db, 'pickupRequests', pickupId), {
    pickupId,
    userId: profile.uid,
    userName: profile.name,
    userPhone: profile.phone || '',
    wasteId: data.wasteId || null,
    collectorId: null,
    collectorName: null,
    category: data.category,
    itemName: data.itemName.trim(),
    quantity: Number(data.quantity),
    unit: data.unit,
    address: data.address.trim(),
    landmark: (data.landmark || '').trim(),
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
    notes: (data.notes || '').trim(),
    imageUrl: data.imageUrl || '',
    imagePath: data.imagePath || '',
    status: 'REQUESTED',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return pickupId;
}

/** actions: accept | on_the_way | collected | complete | cancel | set_status (admin) */
export const updatePickupStatus = (pickupId, action, extra = {}) =>
  callFunction('updatePickupStatus', { pickupId, action, ...extra });

export const assignCollector = (pickupId, collectorId) => callFunction('assignCollector', { pickupId, collectorId });

export const subscribeUserPickups = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const subscribeCollectorPickups = (uid, onData, onError) =>
  listen(query(col, where('collectorId', '==', uid)), onData, onError);

export const subscribeAllPickups = (onData, onError) =>
  listen(query(col, orderBy('createdAt', 'desc')), onData, onError);
