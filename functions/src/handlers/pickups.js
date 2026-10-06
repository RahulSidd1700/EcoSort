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
import { PICKUP_STATUS as S, CATEGORY_LABELS } from '../constants.js';

const FINAL = [S.COMPLETED, S.CANCELLED];

const USER_MESSAGES = {
  [S.ON_THE_WAY]: 'Your collector is on the way.',
  [S.COLLECTED]: 'Your waste has been marked as collected.',
  [S.COMPLETED]: 'Your pickup has been completed. Thank you for disposing responsibly!',
  [S.CANCELLED]: 'Your pickup request has been cancelled.',
  [S.ASSIGNED]: 'Your pickup request has been assigned.',
  [S.REQUESTED]: 'Your pickup request status was updated to Requested.',
};

function pointsForCategory(category, rewards) {
  if (category === 'ewaste') return Number(rewards.ewastePickup) || 0;
  if (category === 'recyclable') return Number(rewards.recyclablePickup) || 0;
  return Number(rewards.otherPickup) || 0;
}

/** assignCollector({ pickupId, collectorId }) - admin only */
export const assignCollector = onCall(async (request) => {
  const admin = await requireRole(request, ['admin']);
  const pickupId = requireString(request.data?.pickupId, 'pickupId', 100);
  const collectorId = requireString(request.data?.collectorId, 'collectorId', 100);

  const collectorUser = await db.collection('users').doc(collectorId).get();
  if (!collectorUser.exists || collectorUser.data().role !== 'collector' || collectorUser.data().active === false) {
    throw new HttpsError('failed-precondition', 'Selected collector is not an active collector.');
  }
  const collector = collectorUser.data();
  const pickupRef = db.collection('pickupRequests').doc(pickupId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(pickupRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Pickup request not found.');
    const pickup = snap.data();
    if (![S.REQUESTED, S.ASSIGNED].includes(pickup.status)) {
      throw new HttpsError('failed-precondition', 'Only requested or assigned pickups can be (re)assigned.');
    }
    tx.update(pickupRef, {
      collectorId,
      collectorName: collector.name || 'Collector',
      collectorPhone: collector.phone || '',
      status: S.ASSIGNED,
      acceptedByCollector: false,
      assignedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion(historyEntry(S.ASSIGNED, admin, `Assigned to ${collector.name}`)),
    });
    addNotification(tx, {
      userId: pickup.userId,
      title: 'Pickup assigned',
      message: `Your pickup request has been assigned to ${collector.name}.`,
      type: 'pickup',
      link: '/pickups',
    });
    addNotification(tx, {
      userId: collectorId,
      title: 'New pickup assigned',
      message: `${CATEGORY_LABELS[pickup.category]} pickup (${pickup.itemName}) on ${pickup.preferredDate}.`,
      type: 'pickup',
      link: '/collector/assigned',
    });
  });
  return { success: true };
});

/**
 * updatePickupStatus({ pickupId, action, status? })
 * actions: accept | on_the_way | collected | complete | cancel | set_status (admin)
 * Completion runs in a transaction and awards EcoPoints exactly once.
 */
export const updatePickupStatus = onCall(async (request) => {
  const actor = await requireRole(request, ['user', 'collector', 'admin']);
  const pickupId = requireString(request.data?.pickupId, 'pickupId', 100);
  const action = requireString(request.data?.action, 'action', 30);
  const rewards = await getRewardSettings();
  const pickupRef = db.collection('pickupRequests').doc(pickupId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(pickupRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Pickup request not found.');
    const pickup = snap.data();
    const rewardSnap = await tx.get(db.collection('rewardTransactions').doc(`PICKUP_${pickupId}`));

    const isAdmin = actor.role === 'admin';
    const isAssignedCollector = actor.role === 'collector' && pickup.collectorId === actor.id;
    const isOwner = pickup.userId === actor.id;

    if (pickup.status === S.COMPLETED && (action === 'complete' || request.data?.status === S.COMPLETED)) {
      throw new HttpsError('failed-precondition', 'This pickup is already completed.');
    }
    if (FINAL.includes(pickup.status)) {
      throw new HttpsError('failed-precondition', `This pickup is already ${pickup.status.toLowerCase()}.`);
    }

    let next = pickup.status;
    const extra = {};
    let note = '';

    switch (action) {
      case 'accept':
        if (!isAssignedCollector) throw new HttpsError('permission-denied', 'Only the assigned collector can accept.');
        if (pickup.status !== S.ASSIGNED)
          throw new HttpsError('failed-precondition', 'Pickup is not in Assigned state.');
        if (pickup.acceptedByCollector) throw new HttpsError('failed-precondition', 'Pickup already accepted.');
        extra.acceptedByCollector = true;
        note = 'Collector accepted the pickup';
        break;
      case 'on_the_way':
        if (!isAssignedCollector && !isAdmin) throw new HttpsError('permission-denied', 'Not allowed.');
        if (pickup.status !== S.ASSIGNED) throw new HttpsError('failed-precondition', 'Pickup must be Assigned first.');
        if (!isAdmin && !pickup.acceptedByCollector)
          throw new HttpsError('failed-precondition', 'Please accept the pickup first.');
        next = S.ON_THE_WAY;
        break;
      case 'collected':
        if (!isAssignedCollector && !isAdmin) throw new HttpsError('permission-denied', 'Not allowed.');
        if (pickup.status !== S.ON_THE_WAY)
          throw new HttpsError('failed-precondition', 'Pickup must be On The Way first.');
        next = S.COLLECTED;
        extra.collectedAt = FieldValue.serverTimestamp();
        break;
      case 'complete':
        if (!isAssignedCollector && !isAdmin) throw new HttpsError('permission-denied', 'Not allowed.');
        if (pickup.status !== S.COLLECTED)
          throw new HttpsError('failed-precondition', 'Waste must be Collected first.');
        next = S.COMPLETED;
        break;
      case 'cancel':
        if (isOwner && ![S.REQUESTED, S.ASSIGNED].includes(pickup.status)) {
          throw new HttpsError('failed-precondition', 'Pickup can no longer be cancelled.');
        }
        if (!isOwner && !isAdmin) throw new HttpsError('permission-denied', 'Not allowed.');
        next = S.CANCELLED;
        note = typeof request.data?.reason === 'string' ? request.data.reason.slice(0, 200) : '';
        break;
      case 'set_status': {
        if (!isAdmin) throw new HttpsError('permission-denied', 'Only admins can override status.');
        const status = request.data?.status;
        if (!Object.values(S).includes(status) || status === pickup.status) {
          throw new HttpsError('invalid-argument', 'Invalid status.');
        }
        if (status !== S.REQUESTED && status !== S.CANCELLED && !pickup.collectorId) {
          throw new HttpsError('failed-precondition', 'Assign a collector before moving this pickup forward.');
        }
        next = status;
        note = 'Status changed by admin';
        break;
      }
      default:
        throw new HttpsError('invalid-argument', 'Unknown action.');
    }

    if (next === S.COMPLETED) extra.completedAt = FieldValue.serverTimestamp();
    if (next === S.CANCELLED) extra.cancelledAt = FieldValue.serverTimestamp();

    tx.update(pickupRef, {
      ...extra,
      status: next,
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion(historyEntry(action === 'accept' ? 'ACCEPTED' : next, actor, note)),
    });

    if (next !== pickup.status) {
      addNotification(tx, {
        userId: pickup.userId,
        title: 'Pickup update',
        message: `${USER_MESSAGES[next]} (${pickup.itemName})`,
        type: 'pickup',
        link: '/pickups',
      });
      if (next === S.CANCELLED && pickup.collectorId && !isAssignedCollector) {
        addNotification(tx, {
          userId: pickup.collectorId,
          title: 'Pickup cancelled',
          message: `Pickup for ${pickup.itemName} was cancelled.`,
          type: 'pickup',
          link: '/collector/assigned',
        });
      }
    }

    let pointsAwarded = 0;
    if (next === S.COMPLETED) {
      const points = pointsForCategory(pickup.category, rewards);
      const awarded = awardPointsInTransaction(tx, rewardSnap, {
        userId: pickup.userId,
        action:
          pickup.category === 'ewaste'
            ? 'EWASTE_PICKUP_COMPLETED'
            : pickup.category === 'recyclable'
              ? 'RECYCLABLE_PICKUP_COMPLETED'
              : 'PICKUP_COMPLETED',
        points,
        referenceId: pickupId,
        label: `${CATEGORY_LABELS[pickup.category]} pickup completed (${pickup.itemName}).`,
      });
      if (awarded) pointsAwarded = points;
    }
    return { status: next, pointsAwarded };
  });

  return { success: true, ...result };
});
