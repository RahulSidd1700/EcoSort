import { collection, doc, getDoc, setDoc, updateDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
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
    status: 'REQUESTED',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return pickupId;
}

/** Updates pickup status via Cloud Function, with direct Firestore update fallback. */
export async function updatePickupStatus(pickupId, action) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Please log in to continue.');

  try {
    return await callFunction('updatePickupStatus', { pickupId, action });
  } catch (fnErr) {
    // If Cloud Functions are unavailable or in emulator without functions, fallback to client update
    const pickupSnap = await getDoc(doc(db, 'pickupRequests', pickupId));
    if (!pickupSnap.exists()) throw new Error('Pickup request not found.', { cause: fnErr });
    const pickup = pickupSnap.data();

    if (action === 'cancel') {
      const isOwner = pickup.userId === currentUid;
      if (!isOwner) throw new Error('Only the requester can cancel this pickup.', { cause: fnErr });
      if (!['REQUESTED', 'ASSIGNED'].includes(pickup.status)) {
        throw new Error('This pickup can no longer be cancelled.', { cause: fnErr });
      }
      await updateDoc(doc(db, 'pickupRequests', pickupId), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    }

    const nextStatus = { accept: 'ASSIGNED', on_the_way: 'ON_THE_WAY', collected: 'COLLECTED', complete: 'COMPLETED' }[action];
    if (!nextStatus) throw fnErr;

    if (pickup.collectorId !== currentUid) throw new Error('Only the assigned collector can update this pickup.', { cause: fnErr });
    if (action === 'accept' && (pickup.status !== 'ASSIGNED' || pickup.acceptedByCollector)) throw new Error('Pickup is not ready to accept.', { cause: fnErr });
    if (action === 'on_the_way' && (pickup.status !== 'ASSIGNED' || !pickup.acceptedByCollector)) throw new Error('Accept the pickup first.', { cause: fnErr });
    if (action === 'collected' && pickup.status !== 'ON_THE_WAY') throw new Error('Pickup must be on the way first.', { cause: fnErr });
    if (action === 'complete' && pickup.status !== 'COLLECTED') throw new Error('Pickup must be collected first.', { cause: fnErr });

    await updateDoc(doc(db, 'pickupRequests', pickupId), {
      status: nextStatus,
      ...(action === 'accept' ? { acceptedByCollector: true } : {}),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  }
}

export async function assignCollector(pickupId, collectorId) {
  const collectorSnap = await getDoc(doc(db, 'collectors', collectorId));
  if (!collectorSnap.exists() || collectorSnap.data().active === false) {
    throw new Error('Selected collector is not active.');
  }
  const collector = collectorSnap.data();
  await updateDoc(doc(db, 'pickupRequests', pickupId), {
    collectorId,
    collectorName: collector.name || 'Collector',
    collectorPhone: collector.phone || '',
    status: 'ASSIGNED',
    acceptedByCollector: false,
    assignedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export const subscribeUserPickups = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const subscribeCollectorPickups = (uid, onData, onError) =>
  listen(query(col, where('collectorId', '==', uid)), onData, onError);

export const subscribeAllPickups = (onData, onError) =>
  listen(query(col, orderBy('createdAt', 'desc')), onData, onError);
