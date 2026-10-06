/**
 * End-to-end test against the local Firebase Emulator Suite.
 * Uses the same client SDK as the React app, so security rules and Cloud Functions are exercised for real.
 *
 *   1. npm run emulators
 *   2. $env:DEMO_PASSWORD="test1234"; npm run seed:emulator
 *   3. $env:DEMO_PASSWORD="test1234"; npm run test:e2e
 */
import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage, connectStorageEmulator, ref, uploadBytes } from 'firebase/storage';

// Negative tests intentionally trigger PERMISSION_DENIED; keep the SDK from logging each one.
setLogLevel('silent');

const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) {
  console.error('Set DEMO_PASSWORD (same value used for seeding).');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const results = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    results.push(`  ✔ ${name}`);
  } catch (error) {
    failed++;
    results.push(`  ✖ ${name}\n      ${error.message}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'assertion failed');
};
async function expectDenied(fn, codePart = '') {
  try {
    await fn();
  } catch (error) {
    if (codePart && !String(error.code).includes(codePart)) throw new Error(`Expected ${codePart}, got ${error.code}: ${error.message}`, { cause: error });
    return error;
  }
  throw new Error('Expected the operation to be rejected, but it succeeded');
}

let appCount = 0;
async function client(email, password = PASSWORD) {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-ecosort', storageBucket: 'demo-ecosort.appspot.com' }, `app${appCount++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const fns = getFunctions(app, 'asia-south1');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  if (email) await signInWithEmailAndPassword(auth, email, password);
  const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);
  return { app, auth, db, storage, call, uid: () => auth.currentUser?.uid };
}

const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
);

async function main() {
  const anon = await client(null);
  console.log('Authentication');
  await check('wrong password is rejected', () =>
    expectDenied(() => signInWithEmailAndPassword(anon.auth, 'demo-user@example.com', 'wrong-password'), 'auth/'),
  );

  const user = await client('demo-user@example.com');
  const user2 = await client('demo-user2@example.com');
  const collector = await client('demo-collector@example.com');
  const admin = await client('demo-admin@example.com');
  await check('demo user, collector and admin can log in', () => assert(user.uid() && collector.uid() && admin.uid()));

  // Registration
  const newEmail = `new-${Date.now()}@example.com`;
  const fresh = await client(null);
  await createUserWithEmailAndPassword(fresh.auth, newEmail, 'secret123');
  const base = { uid: fresh.uid(), name: 'New Person', email: newEmail, phone: '9999999999', address: '1, Test Street, City', area: 'Test', ecoPoints: 0, active: true, createdAt: serverTimestamp() };
  await check('registration cannot self-assign the admin role', () => expectDenied(() => setDoc(doc(fresh.db, 'users', fresh.uid()), { ...base, role: 'admin' }), 'permission-denied'));
  await check('registration cannot start with extra EcoPoints', () => expectDenied(() => setDoc(doc(fresh.db, 'users', fresh.uid()), { ...base, role: 'user', ecoPoints: 500 }), 'permission-denied'));
  await check('normal registration creates a USER profile', () => setDoc(doc(fresh.db, 'users', fresh.uid()), { ...base, role: 'user' }));

  console.log('Profile security');
  await check('user cannot change own role', () => expectDenied(() => updateDoc(doc(user.db, 'users', user.uid()), { role: 'admin' }), 'permission-denied'));
  await check('user cannot change own EcoPoints', () => expectDenied(() => updateDoc(doc(user.db, 'users', user.uid()), { ecoPoints: 9999 }), 'permission-denied'));
  await check('user can update own name/phone', () => updateDoc(doc(user.db, 'users', user.uid()), { name: 'Demo User', phone: '9876500001', updatedAt: serverTimestamp() }));
  await check("user cannot read another user's profile", () => expectDenied(() => getDoc(doc(user.db, 'users', user2.uid())), 'permission-denied'));
  await check('collector cannot list users', () => expectDenied(() => getDocs(collection(collector.db, 'users')), 'permission-denied'));

  console.log('Waste identification');
  const imagePath = `waste-images/${user.uid()}/test-${Date.now()}.png`;
  await check('user can upload an image to own folder', () => uploadBytes(ref(user.storage, imagePath), PNG, { contentType: 'image/png' }));
  await check("user cannot upload into another user's folder", () =>
    expectDenied(() => uploadBytes(ref(user.storage, `waste-images/${user2.uid()}/x.png`), PNG, { contentType: 'image/png' })),
  );
  await check('non-image upload is rejected', () =>
    expectDenied(() => uploadBytes(ref(user.storage, `waste-images/${user.uid()}/x.txt`), new TextEncoder().encode('hi'), { contentType: 'text/plain' })),
  );
  await check('classifyWaste rejects images of other users', () =>
    expectDenied(() => user.call('classifyWaste', { imagePath: `waste-images/${user2.uid()}/x.png` }), 'permission-denied'),
  );
  let aiWorked = false;
  await check('classifyWaste returns a valid result OR a clean "unavailable" error (manual fallback)', async () => {
    try {
      const r = await user.call('classifyWaste', { imagePath });
      aiWorked = true;
      assert(['recyclable', 'non_recyclable', 'organic', 'ewaste', 'hazardous'].includes(r.category), `bad category ${r.category}`);
    } catch (error) {
      assert(String(error.code).includes('unavailable'), `unexpected error ${error.code}: ${error.message}`);
    }
  });
  const wasteRef = doc(collection(user.db, 'wasteItems'));
  const waste = { wasteId: wasteRef.id, userId: user.uid(), imageUrl: '', imagePath, itemName: 'Plastic bottle', category: 'recyclable', confidence: null, description: '', recommendedAction: '', quantity: 1, unit: 'item', recyclable: true, estimatedValueMin: null, estimatedValueMax: null, source: 'manual', createdAt: serverTimestamp() };
  await check('manual classification is saved to Firestore', () => setDoc(wasteRef, waste));
  await check('arbitrary category names are rejected', () => expectDenied(() => setDoc(doc(collection(user.db, 'wasteItems')), { ...waste, category: 'plastic' }), 'permission-denied'));
  await check('quantity must be greater than zero', () => expectDenied(() => setDoc(doc(collection(user.db, 'wasteItems')), { ...waste, quantity: 0 }), 'permission-denied'));

  console.log('Marketplace');
  const listingRef = doc(collection(user.db, 'wasteListings'));
  const listing = { listingId: listingRef.id, sellerId: user.uid(), sellerName: 'Demo User', sellerArea: 'Koramangala', wasteId: null, itemName: 'Old laptop', category: 'ewaste', description: 'Test', quantity: 1, unit: 'item', condition: 'fair', expectedPrice: 2000, imageUrl: '', imagePath: '', pickupAvailable: true, status: 'AVAILABLE', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await check('listing cannot be created as SOLD', () => expectDenied(() => setDoc(doc(collection(user.db, 'wasteListings')), { ...listing, status: 'SOLD' }), 'permission-denied'));
  await check('organic waste cannot be listed for sale', () => expectDenied(() => setDoc(doc(collection(user.db, 'wasteListings')), { ...listing, category: 'organic' }), 'permission-denied'));
  await check('negative price is rejected', () => expectDenied(() => setDoc(doc(collection(user.db, 'wasteListings')), { ...listing, expectedPrice: -5 }), 'permission-denied'));
  await check('user creates a listing', () => setDoc(listingRef, listing));
  await check('seller edits the listing', () => updateDoc(listingRef, { expectedPrice: 1800, updatedAt: serverTimestamp() }));
  await check('seller cannot change status directly', () => expectDenied(() => updateDoc(listingRef, { status: 'SOLD' }), 'permission-denied'));
  await check('users cannot make offers (collectors only)', () => expectDenied(() => user2.call('listingAction', { listingId: listingRef.id, action: 'make_offer', offerPrice: 100 }), 'permission-denied'));
  await check('collector makes an offer', async () => assert((await collector.call('listingAction', { listingId: listingRef.id, action: 'make_offer', offerPrice: 1500, message: 'Test offer' })).status === 'OFFER_RECEIVED'));
  await check('seller accepts the offer', async () => assert((await user.call('listingAction', { listingId: listingRef.id, action: 'accept_offer' })).status === 'ACCEPTED'));
  await check('seller cannot delete after acceptance', () => expectDenied(() => deleteDoc(listingRef), 'permission-denied'));
  await check('seller and buyer can read contact arrangement', async () => {
    assert((await getDoc(doc(user.db, 'wasteListings', listingRef.id, 'private', 'arrangement'))).exists());
    assert((await getDoc(doc(collector.db, 'wasteListings', listingRef.id, 'private', 'arrangement'))).exists());
  });
  await check('unrelated user cannot read contact arrangement', () => expectDenied(() => getDoc(doc(user2.db, 'wasteListings', listingRef.id, 'private', 'arrangement')), 'permission-denied'));
  const pointsBeforeSale = (await getDoc(doc(user.db, 'users', user.uid()))).data().ecoPoints;
  await check('mark sold awards +30 once', async () => assert((await user.call('listingAction', { listingId: listingRef.id, action: 'mark_sold' })).pointsAwarded === 30));
  await check('marking sold twice is rejected', () => expectDenied(() => collector.call('listingAction', { listingId: listingRef.id, action: 'mark_sold' }), 'failed-precondition'));
  await check('seller EcoPoints increased by exactly 30', async () => assert((await getDoc(doc(user.db, 'users', user.uid()))).data().ecoPoints === pointsBeforeSale + 30));
  const delRef = doc(collection(user.db, 'wasteListings'));
  await check('seller deletes an AVAILABLE listing', async () => {
    await setDoc(delRef, { ...listing, listingId: delRef.id });
    await deleteDoc(delRef);
  });

  console.log('Pickups');
  const pickupRef = doc(collection(user.db, 'pickupRequests'));
  const today = new Date().toISOString().slice(0, 10);
  const pickup = { pickupId: pickupRef.id, userId: user.uid(), userName: 'Demo User', userPhone: '9876500001', wasteId: null, collectorId: null, collectorName: null, category: 'ewaste', itemName: 'Old phones', quantity: 2, unit: 'item', address: '12, 5th Cross, Koramangala, Bengaluru', landmark: '', preferredDate: today, preferredTime: 'morning', notes: '', imageUrl: '', imagePath: '', status: 'REQUESTED', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await check('pickup cannot be created as COMPLETED', () => expectDenied(() => setDoc(doc(collection(user.db, 'pickupRequests')), { ...pickup, status: 'COMPLETED' }), 'permission-denied'));
  await check('user creates a pickup request', () => setDoc(pickupRef, pickup));
  await check('double submit with the same ID is rejected (no duplicate)', () => expectDenied(() => setDoc(pickupRef, pickup), 'permission-denied'));
  await check('user cannot change pickup status directly', () => expectDenied(() => updateDoc(pickupRef, { status: 'COMPLETED' }), 'permission-denied'));
  await check("user cannot query other users' pickups", () => expectDenied(() => getDocs(query(collection(user.db, 'pickupRequests'), where('userId', '==', user2.uid()))), 'permission-denied'));
  await check('collector cannot read an unassigned pickup', () => expectDenied(() => getDoc(doc(collector.db, 'pickupRequests', pickupRef.id)), 'permission-denied'));
  await check('collector cannot assign pickups (admin only)', () => expectDenied(() => collector.call('assignCollector', { pickupId: pickupRef.id, collectorId: collector.uid() }), 'permission-denied'));
  await check('admin assigns the collector', () => admin.call('assignCollector', { pickupId: pickupRef.id, collectorId: collector.uid() }));
  await check('assigned collector can now read the pickup', async () => assert((await getDoc(doc(collector.db, 'pickupRequests', pickupRef.id))).data().status === 'ASSIGNED'));
  await check('collector cannot skip "Accept"', () => expectDenied(() => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'on_the_way' }), 'failed-precondition'));
  await check('collector cannot skip to Completed', () => expectDenied(() => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'complete' }), 'failed-precondition'));
  await check('collector accepts', () => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'accept' }));
  await check('collector marks On The Way', () => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'on_the_way' }));
  await check('user sees status update', async () => assert((await getDoc(pickupRef)).data().status === 'ON_THE_WAY'));
  await check('collector marks Collected', () => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'collected' }));
  await check('user cannot complete the pickup', () => expectDenied(() => user.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'complete' }), 'permission-denied'));
  const pointsBefore = (await getDoc(doc(user.db, 'users', user.uid()))).data().ecoPoints;
  await check('collector completes → e-waste +50 EcoPoints', async () => assert((await collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'complete' })).pointsAwarded === 50));
  await check('completing again is rejected', () => expectDenied(() => collector.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'complete' }), 'failed-precondition'));
  await check('admin override cannot re-complete either', () => expectDenied(() => admin.call('updatePickupStatus', { pickupId: pickupRef.id, action: 'set_status', status: 'COMPLETED' }), 'failed-precondition'));
  await check('user EcoPoints increased by exactly 50', async () => assert((await getDoc(doc(user.db, 'users', user.uid()))).data().ecoPoints === pointsBefore + 50));
  await check('exactly one reward transaction for the pickup', async () => {
    const snap = await getDocs(query(collection(user.db, 'rewardTransactions'), where('userId', '==', user.uid())));
    assert(snap.docs.filter((d) => d.data().referenceId === pickupRef.id).length === 1);
  });
  await check('user received notifications', async () => {
    const snap = await getDocs(query(collection(user.db, 'notifications'), where('userId', '==', user.uid())));
    assert(snap.docs.some((d) => d.data().message.includes('50 EcoPoints')), 'no points notification');
  });
  await check('user cannot create notifications', () => expectDenied(() => setDoc(doc(collection(user.db, 'notifications')), { userId: user.uid(), title: 'x', message: 'x', read: false }), 'permission-denied'));
  await check('user cannot write reward transactions', () => expectDenied(() => setDoc(doc(user.db, 'rewardTransactions', 'FAKE'), { userId: user.uid(), points: 1000 }), 'permission-denied'));
  const cancelRef = doc(collection(user.db, 'pickupRequests'));
  await check('user can cancel a REQUESTED pickup', async () => {
    await setDoc(cancelRef, { ...pickup, pickupId: cancelRef.id });
    assert((await user.call('updatePickupStatus', { pickupId: cancelRef.id, action: 'cancel' })).status === 'CANCELLED');
  });

  console.log('Complaints');
  const complaintRef = doc(collection(user.db, 'complaints'));
  await check('user creates a complaint', () =>
    setDoc(complaintRef, { complaintId: complaintRef.id, userId: user.uid(), userName: 'Demo User', type: 'illegal_dumping', typeLabel: 'Illegal dumping', description: 'Garbage dumped near the lake every night.', imageUrl: '', imagePath: '', address: 'Lake Road, Koramangala', status: 'SUBMITTED', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
  );
  await check('user cannot resolve own complaint', () => expectDenied(() => user.call('updateComplaintStatus', { complaintId: complaintRef.id, status: 'RESOLVED' }), 'permission-denied'));
  await check('admin sets Under Review', () => admin.call('updateComplaintStatus', { complaintId: complaintRef.id, status: 'UNDER_REVIEW' }));
  await check('admin resolves → +15 once', async () => assert((await admin.call('updateComplaintStatus', { complaintId: complaintRef.id, status: 'RESOLVED', adminNote: 'Cleaned' })).pointsAwarded === 15));
  await check('re-saving resolved complaint gives no extra points', async () => assert((await admin.call('updateComplaintStatus', { complaintId: complaintRef.id, status: 'RESOLVED', adminNote: 'Verified again' })).pointsAwarded === 0));

  console.log('Partners & admin');
  await check('user can list active partners', async () => assert((await getDocs(query(collection(user.db, 'partners'), where('active', '==', true)))).size >= 1));
  await check('user cannot list inactive partners', () => expectDenied(() => getDocs(collection(user.db, 'partners')), 'permission-denied'));
  await check('user cannot create partners', () => expectDenied(() => setDoc(doc(collection(user.db, 'partners')), { name: 'Fake', active: true, categories: [] }), 'permission-denied'));
  await check('admin creates a partner', () => setDoc(doc(collection(admin.db, 'partners')), { name: 'Test Partner', type: 'Paper Recycler', categories: ['recyclable'], serviceArea: 'X', phone: '', email: '', address: '', active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await check('admin reads all users', async () => assert((await getDocs(collection(admin.db, 'users'))).size >= 5));
  await check('admin edits reward settings', () => setDoc(doc(admin.db, 'settings', 'rewards'), { recyclablePickup: 20 }, { merge: true }));
  await check('user cannot edit settings', () => expectDenied(() => setDoc(doc(user.db, 'settings', 'rewards'), { recyclablePickup: 999 }, { merge: true }), 'permission-denied'));
  const collectorEmail = `collector-${Date.now()}@example.com`;
  await check('admin creates a collector account', () => admin.call('createCollectorAccount', { name: 'Test Collector', email: collectorEmail, phone: '9000000000', password: 'secret123', serviceAreas: 'Koramangala' }));
  await check('new collector can log in with collector role', async () => {
    const c = await client(collectorEmail, 'secret123');
    assert((await getDoc(doc(c.db, 'users', c.uid()))).data().role === 'collector');
  });
  await check('user cannot create collector accounts', () => expectDenied(() => user.call('createCollectorAccount', { name: 'X', email: 'x@example.com', phone: '9000000000', password: 'secret123' }), 'permission-denied'));
  await check('admin deactivates a user → login blocked', async () => {
    await admin.call('setUserActive', { uid: fresh.uid(), active: false });
    const c = await client(null);
    await expectDenied(() => signInWithEmailAndPassword(c.auth, newEmail, 'secret123'), 'auth/user-disabled');
  });

  console.log('\n' + results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed${aiWorked ? '' : ' (AI key not configured: manual fallback path verified)'}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('Test run crashed:', error);
  process.exit(1);
});
