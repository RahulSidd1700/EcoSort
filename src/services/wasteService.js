import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { listen } from './firestoreHelpers';

const col = collection(db, 'wasteItems');

export async function classifyImage(imageDataUrl, mimeType) {
  const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8787';
  const response = await fetch(`${apiUrl}/api/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl, mimeType }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Image classification failed.');
  return data;
}

/** Saves an AI or manual classification to the user's waste history. */
export async function saveWasteRecord(uid, data) {
  const ref = doc(col);
  await setDoc(ref, {
    wasteId: ref.id,
    userId: uid,
    itemName: data.itemName,
    category: data.category,
    confidence: data.confidence ?? null,
    description: data.description || '',
    recommendedAction: data.recommendedAction || '',
    quantity: Number(data.quantity) || 1,
    unit: data.unit || 'item',
    recyclable: Boolean(data.recyclable),
    estimatedValueMin: data.estimatedValueRange?.min ?? null,
    estimatedValueMax: data.estimatedValueRange?.max ?? null,
    imageUrl: data.imageUrl || null,
    imagePath: data.imagePath || null,
    source: data.source,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export const deleteWasteRecord = (id) => deleteDoc(doc(db, 'wasteItems', id));

/** Lets the user correct the category (e.g. when AI confidence is low). */
export const updateWasteCategory = (id, category) => updateDoc(doc(db, 'wasteItems', id), { category });

export const subscribeUserWaste = (uid, onData, onError) =>
  listen(query(col, where('userId', '==', uid)), onData, onError);

export const subscribeAllWaste = (onData, onError) => listen(query(col, orderBy('createdAt', 'desc')), onData, onError);
