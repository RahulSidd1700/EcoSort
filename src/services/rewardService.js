import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen } from './firestoreHelpers';

// Reward transactions are created only by Cloud Functions (never by the browser).
const col = collection(db, 'rewardTransactions');

export const subscribeUserRewards = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const subscribeAllRewards = (onData, onError) =>
  listen(query(col, orderBy('createdAt', 'desc')), onData, onError);
