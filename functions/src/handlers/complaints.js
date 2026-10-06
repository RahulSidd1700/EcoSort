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
import { COMPLAINT_STATUS } from '../constants.js';

/**
 * updateComplaintStatus({ complaintId, status, adminNote? }) - admin only.
 * A complaint marked RESOLVED counts as "verified" and earns the reporter
 * EcoPoints once (reward ID COMPLAINT_<id> prevents duplicates).
 */
export const updateComplaintStatus = onCall(async (request) => {
  const admin = await requireRole(request, ['admin']);
  const complaintId = requireString(request.data?.complaintId, 'complaintId', 100);
  const status = request.data?.status;
  if (!COMPLAINT_STATUS.includes(status)) throw new HttpsError('invalid-argument', 'Invalid status.');
  const adminNote = String(request.data?.adminNote || '').slice(0, 500);
  const rewards = await getRewardSettings();
  const ref = db.collection('complaints').doc(complaintId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Complaint not found.');
    const complaint = snap.data();
    const rewardSnap = await tx.get(db.collection('rewardTransactions').doc(`COMPLAINT_${complaintId}`));
    if (complaint.status === status && !adminNote) {
      throw new HttpsError('failed-precondition', 'Complaint already has this status.');
    }

    tx.update(ref, {
      status,
      adminNote,
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion(historyEntry(status, admin, adminNote)),
    });
    addNotification(tx, {
      userId: complaint.userId,
      title: 'Complaint update',
      message: `Your report "${complaint.typeLabel || complaint.type}" is now ${status.replace('_', ' ').toLowerCase()}.${adminNote ? ` Note: ${adminNote}` : ''}`,
      type: 'complaint',
      link: '/report',
    });

    let pointsAwarded = 0;
    if (status === 'RESOLVED') {
      const points = Number(rewards.verifiedComplaint) || 0;
      if (
        awardPointsInTransaction(tx, rewardSnap, {
          userId: complaint.userId,
          action: 'VERIFIED_COMPLAINT',
          points,
          referenceId: complaintId,
          label: 'Your waste complaint was verified and resolved.',
        })
      ) {
        pointsAwarded = points;
      }
    }
    return { success: true, pointsAwarded };
  });
});
