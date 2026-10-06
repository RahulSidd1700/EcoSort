import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen, listenDoc, callFunction } from './firestoreHelpers';

const col = collection(db, 'wasteListings');

const editableFields = (data) => ({
  itemName: data.itemName.trim(),
  category: data.category,
  description: (data.description || '').trim(),
  quantity: Number(data.quantity),
  unit: data.unit,
  condition: data.condition,
  expectedPrice: Number(data.expectedPrice),
  imageUrl: data.imageUrl || '',
  imagePath: data.imagePath || '',
  pickupAvailable: Boolean(data.pickupAvailable),
  sellerArea: (data.sellerArea || '').trim(),
});

export async function createListing(profile, data) {
  const ref = doc(col);
  await setDoc(ref, {
    ...editableFields(data),
    listingId: ref.id,
    sellerId: profile.uid,
    sellerName: profile.name,
    wasteId: data.wasteId || null,
    status: 'AVAILABLE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const updateListing = (id, data) =>
  updateDoc(doc(db, 'wasteListings', id), { ...editableFields(data), updatedAt: serverTimestamp() });

export const deleteListing = (id) => deleteDoc(doc(db, 'wasteListings', id));

export async function getListing(id) {
  const snap = await getDoc(doc(db, 'wasteListings', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Contact details shared after an offer is accepted (seller, buyer and admin only). */
export async function getArrangement(id) {
  const snap = await getDoc(doc(db, 'wasteListings', id, 'private', 'arrangement'));
  return snap.exists() ? snap.data() : null;
}

/** Server-validated status change: make_offer, accept_offer, reject_offer, withdraw_offer, mark_sold, cancel, admin_set_status, admin_remove */
export const listingAction = (listingId, action, extra = {}) =>
  callFunction('listingAction', { listingId, action, ...extra });

export const subscribeListings = (onData, onError) => listen(query(col, orderBy('createdAt', 'desc')), onData, onError);

export const subscribeMyListings = (uid, onData, onError) =>
  listen(query(col, where('sellerId', '==', uid)), onData, onError);

export const subscribeBuyerListings = (uid, onData, onError) =>
  listen(query(col, where('buyerId', '==', uid)), onData, onError);

export const subscribeListing = (id, onData, onError) => listenDoc(doc(db, 'wasteListings', id), onData, onError);
