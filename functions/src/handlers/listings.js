import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  db,
  FieldValue,
  requireRole,
  requireString,
  addNotification,
  awardPointsInTransaction,
  getRewardSettings,
  historyEntry,
} from '../helpers.js';
import { LISTING_STATUS as L } from '../constants.js';

const CLEAR_OFFER = {
  buyerId: null,
  buyerName: null,
  offerPrice: null,
  offerMessage: null,
};

/**
 * listingAction({ listingId, action, offerPrice?, message?, status? })
 * Marketplace status transitions are validated here (not in the browser):
 *   AVAILABLE --make_offer--> OFFER_RECEIVED --accept_offer--> ACCEPTED --mark_sold--> SOLD
 *   OFFER_RECEIVED --reject_offer/withdraw_offer--> AVAILABLE
 *   AVAILABLE/OFFER_RECEIVED/ACCEPTED --cancel--> CANCELLED
 * This is a "Sale / Collection Arrangement" - no online payment is processed.
 */
export const listingAction = onCall(async (request) => {
  const actor = await requireRole(request, ['user', 'collector', 'admin']);
  const listingId = requireString(request.data?.listingId, 'listingId', 100);
  const action = requireString(request.data?.action, 'action', 30);
  const rewards = await getRewardSettings();
  const listingRef = db.collection('wasteListings').doc(listingId);
  const arrangementRef = listingRef.collection('private').doc('arrangement');

  if (action === 'admin_remove') {
    if (actor.role !== 'admin') throw new HttpsError('permission-denied', 'Only admins can remove listings.');
    const snap = await listingRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Listing not found.');
    const batch = db.batch();
    batch.delete(arrangementRef);
    batch.delete(listingRef);
    addNotification(batch, {
      userId: snap.data().sellerId,
      title: 'Listing removed',
      message: `Your listing "${snap.data().itemName}" was removed by an administrator. Reason: ${String(request.data?.reason || 'Policy violation').slice(0, 200)}`,
      type: 'listing',
      link: '/sell',
    });
    await batch.commit();
    return { success: true };
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(listingRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Listing not found.');
    const listing = snap.data();
    const rewardSnap = await tx.get(db.collection('rewardTransactions').doc(`SALE_${listingId}`));
    const isSeller = listing.sellerId === actor.id;
    const isBuyer = listing.buyerId && listing.buyerId === actor.id;
    const isAdmin = actor.role === 'admin';

    const update = {};
    let next = listing.status;
    let note = '';
    const notify = [];

    const expect = (statuses, message) => {
      if (!statuses.includes(listing.status)) throw new HttpsError('failed-precondition', message);
    };

    switch (action) {
      case 'make_offer': {
        if (actor.role !== 'collector')
          throw new HttpsError('permission-denied', 'Only collectors/recyclers can make offers.');
        if (isSeller) throw new HttpsError('failed-precondition', 'You cannot make an offer on your own listing.');
        expect([L.AVAILABLE], 'This listing is not accepting offers right now.');
        const offerPrice = Number(request.data?.offerPrice);
        if (!Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice > 10000000) {
          throw new HttpsError('invalid-argument', 'Offer price must be zero or greater.');
        }
        Object.assign(update, {
          buyerId: actor.id,
          buyerName: actor.name || 'Recycler',
          offerPrice,
          offerMessage: String(request.data?.message || '').slice(0, 300),
          offeredAt: FieldValue.serverTimestamp(),
        });
        next = L.OFFER_RECEIVED;
        note = `Offer of Rs. ${offerPrice} by ${actor.name}`;
        notify.push({
          userId: listing.sellerId,
          title: 'New offer received',
          message: `${actor.name} offered Rs. ${offerPrice} for "${listing.itemName}".`,
        });
        break;
      }
      case 'accept_offer': {
        if (!isSeller) throw new HttpsError('permission-denied', 'Only the seller can accept offers.');
        expect([L.OFFER_RECEIVED], 'There is no pending offer to accept.');
        const [sellerSnap, buyerSnap] = await Promise.all([
          tx.get(db.collection('users').doc(listing.sellerId)),
          tx.get(db.collection('users').doc(listing.buyerId)),
        ]);
        const seller = sellerSnap.data() || {};
        const buyer = buyerSnap.data() || {};
        // Contact details are stored in a private sub-document readable only by seller, buyer and admin.
        tx.set(arrangementRef, {
          sellerId: listing.sellerId,
          sellerName: seller.name || '',
          sellerPhone: seller.phone || '',
          sellerAddress: seller.address || '',
          buyerId: listing.buyerId,
          buyerName: buyer.name || '',
          buyerPhone: buyer.phone || '',
          buyerEmail: buyer.email || '',
          agreedPrice: listing.offerPrice,
          createdAt: FieldValue.serverTimestamp(),
        });
        update.acceptedAt = FieldValue.serverTimestamp();
        next = L.ACCEPTED;
        note = 'Seller accepted the offer';
        notify.push({
          userId: listing.buyerId,
          title: 'Offer accepted',
          message: `Your offer for "${listing.itemName}" was accepted. Please arrange the collection with the seller.`,
        });
        notify.push({
          userId: listing.sellerId,
          title: 'Listing accepted',
          message: `Your marketplace listing "${listing.itemName}" has been accepted. Contact details are on the listing page.`,
        });
        break;
      }
      case 'reject_offer':
      case 'withdraw_offer': {
        if (action === 'reject_offer' && !isSeller)
          throw new HttpsError('permission-denied', 'Only the seller can reject offers.');
        if (action === 'withdraw_offer' && !isBuyer)
          throw new HttpsError('permission-denied', 'Only the buyer can withdraw the offer.');
        expect([L.OFFER_RECEIVED], 'There is no pending offer.');
        Object.assign(update, CLEAR_OFFER);
        next = L.AVAILABLE;
        note = action === 'reject_offer' ? 'Seller rejected the offer' : 'Buyer withdrew the offer';
        notify.push(
          action === 'reject_offer'
            ? {
                userId: listing.buyerId,
                title: 'Offer declined',
                message: `Your offer for "${listing.itemName}" was declined.`,
              }
            : {
                userId: listing.sellerId,
                title: 'Offer withdrawn',
                message: `The offer for "${listing.itemName}" was withdrawn.`,
              },
        );
        break;
      }
      case 'mark_sold': {
        if (!isSeller && !isBuyer && !isAdmin) throw new HttpsError('permission-denied', 'Not allowed.');
        expect([L.ACCEPTED], 'Only accepted listings can be marked as sold.');
        update.soldAt = FieldValue.serverTimestamp();
        next = L.SOLD;
        note = 'Sale / collection completed';
        if (listing.buyerId && listing.buyerId !== actor.id) {
          notify.push({
            userId: listing.buyerId,
            title: 'Transaction completed',
            message: `"${listing.itemName}" was marked as sold.`,
          });
        }
        break;
      }
      case 'cancel': {
        if (!isSeller && !isAdmin) throw new HttpsError('permission-denied', 'Only the seller can cancel.');
        expect([L.AVAILABLE, L.OFFER_RECEIVED, L.ACCEPTED], 'This listing can no longer be cancelled.');
        next = L.CANCELLED;
        note = 'Listing cancelled';
        if (listing.buyerId) {
          notify.push({
            userId: listing.buyerId,
            title: 'Listing cancelled',
            message: `"${listing.itemName}" was cancelled by the seller.`,
          });
        }
        break;
      }
      case 'admin_set_status': {
        if (!isAdmin) throw new HttpsError('permission-denied', 'Only admins can change status directly.');
        const status = request.data?.status;
        if (!Object.values(L).includes(status) || status === listing.status) {
          throw new HttpsError('invalid-argument', 'Invalid status.');
        }
        if ([L.OFFER_RECEIVED, L.ACCEPTED, L.SOLD].includes(status) && !listing.buyerId) {
          throw new HttpsError('failed-precondition', 'This status needs a buyer offer first.');
        }
        if (status === L.AVAILABLE) Object.assign(update, CLEAR_OFFER);
        if (status === L.SOLD) update.soldAt = FieldValue.serverTimestamp();
        next = status;
        note = 'Status changed by admin';
        notify.push({
          userId: listing.sellerId,
          title: 'Listing updated',
          message: `An administrator changed "${listing.itemName}" to ${status.replace('_', ' ').toLowerCase()}.`,
        });
        break;
      }
      default:
        throw new HttpsError('invalid-argument', 'Unknown action.');
    }

    tx.update(listingRef, {
      ...update,
      status: next,
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion(historyEntry(next, actor, note)),
    });
    notify.forEach((n) => addNotification(tx, { ...n, type: 'listing', link: `/marketplace/${listingId}` }));

    let pointsAwarded = 0;
    if (next === L.SOLD) {
      const points = Number(rewards.saleCompleted) || 0;
      if (
        awardPointsInTransaction(tx, rewardSnap, {
          userId: listing.sellerId,
          action: 'SALE_COMPLETED',
          points,
          referenceId: listingId,
          label: `Recycling/sale completed (${listing.itemName}).`,
        })
      ) {
        pointsAwarded = points;
      }
    }
    return { success: true, status: next, pointsAwarded };
  });
});
