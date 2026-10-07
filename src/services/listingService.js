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
import { auth, db } from '../firebase/config';
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
export async function listingAction(listingId, action, extra = {}) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error('Please log in to continue.');
  const listingRef = doc(db, 'wasteListings', listingId);
  const listingSnap = await getDoc(listingRef);
  if (!listingSnap.exists()) throw new Error('Listing not found.');
  const listing = listingSnap.data();
  const profileSnap = await getDoc(doc(db, 'users', currentUid));
  const profile = profileSnap.exists() ? profileSnap.data() : null;

  if (action === 'make_offer') {
    if (profile?.role !== 'collector') throw new Error('Only collectors can make offers.');
    await updateDoc(listingRef, {
      buyerId: currentUid,
      buyerName: profile.name,
      offerPrice: Number(extra.offerPrice),
      offerMessage: String(extra.message || '').trim(),
      status: 'OFFER_RECEIVED',
      updatedAt: serverTimestamp(),
    });
  } else if (action === 'accept_offer' || action === 'reject_offer') {
    if (listing.sellerId !== currentUid) throw new Error('Only the seller can respond to this offer.');
    await updateDoc(listingRef, { status: action === 'accept_offer' ? 'ACCEPTED' : 'AVAILABLE', updatedAt: serverTimestamp() });
  } else if (action === 'withdraw_offer') {
    if (listing.buyerId !== currentUid) throw new Error('Only the buyer can withdraw this offer.');
    await updateDoc(listingRef, { status: 'AVAILABLE', updatedAt: serverTimestamp() });
  } else if (action === 'mark_sold') {
    if (![listing.sellerId, listing.buyerId].includes(currentUid)) throw new Error('Only the buyer or seller can complete this sale.');
    await updateDoc(listingRef, { status: 'SOLD', soldAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } else if (action === 'cancel') {
    if (listing.sellerId !== currentUid) throw new Error('Only the seller can cancel this listing.');
    await updateDoc(listingRef, { status: 'CANCELLED', updatedAt: serverTimestamp() });
  } else if (action === 'admin_set_status') {
    if (profile?.role !== 'admin') throw new Error('Only admins can change listing status.');
    await updateDoc(listingRef, { status: extra.status, updatedAt: serverTimestamp() });
  } else if (action === 'admin_remove') {
    if (profile?.role !== 'admin') throw new Error('Only admins can remove listings.');
    await deleteDoc(listingRef);
  } else {
    return callFunction('listingAction', { listingId, action, ...extra });
  }
  return { success: true };
}

export const subscribeListings = (onData, onError) => listen(query(col, orderBy('createdAt', 'desc')), onData, onError);

export const subscribeMyListings = (uid, onData, onError) =>
  listen(query(col, where('sellerId', '==', uid)), onData, onError);

export const subscribeBuyerListings = (uid, onData, onError) =>
  listen(query(col, where('buyerId', '==', uid)), onData, onError);

export const subscribeListing = (id, onData, onError) => listenDoc(doc(db, 'wasteListings', id), onData, onError);
