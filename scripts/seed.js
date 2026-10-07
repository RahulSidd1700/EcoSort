/**
 * EcoSort seed script (development only).
 *
 *   node scripts/seed.js --config               categories + settings (safe for any project)
 *   node scripts/seed.js --config --demo        + demo accounts and demo data (isDemo: true)
 *   node scripts/seed.js --clear-demo           removes all demo data and demo accounts
 *
 * Add --emulator to target the local Firebase Emulator Suite.
 * Demo data is refused on a real project unless --allow-production is given.
 * Demo account passwords come from the DEMO_PASSWORD environment variable
 * (never hard-coded), e.g. PowerShell:  $env:DEMO_PASSWORD="choose-a-password"
 */
import { args, useEmulator, projectId, db, auth, Timestamp } from './firebaseAdmin.js';

const wantConfig = args.includes('--config');
const wantDemo = args.includes('--demo');
const clearDemo = args.includes('--clear-demo');

const CATEGORIES = {
  recyclable: { label: 'Recyclable', description: 'Clean, dry materials that can be processed into new products.', examples: ['Paper', 'Cardboard', 'Plastic bottles', 'Metal cans', 'Glass'], action: 'Clean and dry the item, then place it in recyclable waste or submit it for recycling.' },
  organic: { label: 'Organic', description: 'Biodegradable waste that can be composted.', examples: ['Food waste', 'Vegetable waste', 'Fruit waste', 'Garden waste'], action: 'Consider composting or organic-waste collection.' },
  ewaste: { label: 'E-Waste', description: 'Discarded electrical and electronic equipment.', examples: ['Mobile phones', 'Laptops', 'Chargers', 'Keyboards', 'Electronic devices', 'Batteries'], action: 'Treat as e-waste. Do not dispose of it with normal household waste. Use an authorised e-waste collector.' },
  hazardous: { label: 'Hazardous', description: 'Materials that can harm people or the environment if handled incorrectly.', examples: ['Batteries', 'Chemicals', 'Paint containers', 'Other hazardous household materials'], action: 'Use an appropriate specialised collection service. Never burn, bury or pour it into drains.' },
  non_recyclable: { label: 'Non-Recyclable', description: 'Waste that cannot be recycled easily.', examples: ['Dirty tissues', 'Contaminated materials', 'Mixed waste that cannot be recycled easily'], action: 'Place it in general waste. Keep it separate from recyclable and organic waste.' },
};

const SETTINGS = {
  rewards: { recyclablePickup: 20, ewastePickup: 50, otherPickup: 10, saleCompleted: 30, verifiedComplaint: 15 },
  rates: {
    items: [
      { material: 'Plastic', min: 20, max: 40, unit: 'kg' },
      { material: 'Cardboard', min: 8, max: 15, unit: 'kg' },
      { material: 'Newspaper / Paper', min: 10, max: 18, unit: 'kg' },
      { material: 'Aluminium', min: 100, max: 180, unit: 'kg' },
      { material: 'Iron / Steel', min: 25, max: 40, unit: 'kg' },
      { material: 'Copper', min: 500, max: 750, unit: 'kg' },
      { material: 'Glass', min: 2, max: 5, unit: 'kg' },
      { material: 'E-waste', min: null, max: null, unit: 'Variable' },
    ],
  },
  impact: { kgPerItem: 0.5, kgPerBag: 5, co2PerKg: { recyclable: 1.5, ewaste: 2.0, organic: 0.5, hazardous: 0.3, non_recyclable: 0.1 } },
};

const DEMO_ACCOUNTS = [
  { key: 'user', email: 'demo-user@example.com', name: 'Demo User', role: 'user', phone: '9876500001', address: '12, 5th Cross, Koramangala, Bengaluru', area: 'Koramangala' },
  { key: 'user2', email: 'demo-user2@example.com', name: 'Priya Sharma', role: 'user', phone: '9876500002', address: '45, Sector 2, HSR Layout, Bengaluru', area: 'HSR Layout' },
  { key: 'collector', email: 'demo-collector@example.com', name: 'Ravi Kumar (Demo Collector)', role: 'collector', phone: '9876500003', address: '', area: 'Koramangala', serviceAreas: ['Koramangala', 'BTM Layout'] },
  { key: 'collector2', email: 'demo-collector2@example.com', name: 'GreenCycle Recyclers (Demo)', role: 'collector', phone: '9876500004', address: '', area: 'HSR Layout', serviceAreas: ['HSR Layout', 'Indiranagar'] },
  { key: 'admin', email: 'demo-admin@example.com', name: 'Demo Admin', role: 'admin', phone: '9876500005', address: 'EcoSort Office, Bengaluru', area: '' },
];

const DEMO_COLLECTIONS = ['wasteItems', 'wasteListings', 'pickupRequests', 'complaints', 'partners', 'rewardTransactions', 'notifications', 'collectors'];

const daysAgo = (n) => Timestamp.fromDate(new Date(Date.now() - n * 86400000));
const dateISO = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

async function seedConfig() {
  const batch = db.batch();
  Object.entries(CATEGORIES).forEach(([id, data]) => batch.set(db.collection('categories').doc(id), data, { merge: true }));
  Object.entries(SETTINGS).forEach(([id, data]) => batch.set(db.collection('settings').doc(id), data, { merge: true }));
  await batch.commit();
  console.log('✔ Categories and settings written');
}

async function upsertAccount(account, password) {
  let user;
  try {
    user = await auth.getUserByEmail(account.email);
    await auth.updateUser(user.uid, { password, displayName: account.name, disabled: false });
  } catch {
    user = await auth.createUser({ email: account.email, password, displayName: account.name });
  }
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    name: account.name,
    email: account.email,
    phone: account.phone,
    address: account.address,
    area: account.area,
    role: account.role,
    ecoPoints: 0,
    active: true,
    isDemo: true,
    createdAt: daysAgo(40),
  });
  if (account.role === 'collector') {
    await db.collection('collectors').doc(user.uid).set({
      uid: user.uid,
      name: account.name,
      email: account.email,
      phone: account.phone,
      serviceAreas: account.serviceAreas,
      available: true,
      active: true,
      isDemo: true,
      createdAt: daysAgo(40),
    });
  }
  return { ...account, uid: user.uid };
}

async function seedDemo() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error('Set the DEMO_PASSWORD environment variable (min 6 characters) before seeding demo accounts.');
  }
  const a = {};
  for (const account of DEMO_ACCOUNTS) a[account.key] = await upsertAccount(account, password);
  console.log('✔ Demo accounts ready:', DEMO_ACCOUNTS.map((x) => x.email).join(', '));

  const batch = db.batch();
  const demo = { isDemo: true };
  const hist = (status, by, note, days) => ({ status, at: daysAgo(days), byId: by.uid, byName: by.name, byRole: by.role, note });

  // Waste records
  [
    { id: 'demo-waste-1', itemName: 'Plastic Bottle', category: 'recyclable', confidence: 0.96, quantity: 2, unit: 'kg', min: 40, max: 80, days: 12 },
    { id: 'demo-waste-2', itemName: 'Old Mobile Phone', category: 'ewaste', confidence: 0.94, quantity: 1, unit: 'item', min: 500, max: 2000, days: 8 },
    { id: 'demo-waste-3', itemName: 'Vegetable Peels', category: 'organic', confidence: 0.9, quantity: 1, unit: 'bag', min: null, max: null, days: 3 },
    { id: 'demo-waste-4', itemName: 'AA Batteries', category: 'hazardous', confidence: 0.55, quantity: 6, unit: 'item', min: null, max: null, days: 1 },
  ].forEach((w) =>
    batch.set(db.collection('wasteItems').doc(w.id), {
      ...demo,
      wasteId: w.id,
      userId: a.user.uid,
      itemName: w.itemName,
      category: w.category,
      confidence: w.confidence,
      description: CATEGORIES[w.category].description,
      recommendedAction: CATEGORIES[w.category].action,
      quantity: w.quantity,
      unit: w.unit,
      recyclable: ['recyclable', 'ewaste'].includes(w.category),
      estimatedValueMin: w.min,
      estimatedValueMax: w.max,
      source: 'ai',
      createdAt: daysAgo(w.days),
    }),
  );

  // Pickup requests in different stages
  const pickupBase = (id, user, extra) => ({
    ...demo,
    pickupId: id,
    userId: user.uid,
    userName: user.name,
    userPhone: user.phone,
    wasteId: null,
    collectorId: null,
    collectorName: null,
    landmark: '',
    notes: '',
    address: user.address,
    preferredTime: 'morning',
    history: [],
    ...extra,
  });
  batch.set(db.collection('pickupRequests').doc('demo-pickup-1'), pickupBase('demo-pickup-1', a.user, {
    category: 'recyclable', itemName: 'Newspapers and cardboard', quantity: 8, unit: 'kg', preferredDate: dateISO(-10),
    status: 'COMPLETED', collectorId: a.collector.uid, collectorName: a.collector.name, collectorPhone: a.collector.phone, acceptedByCollector: true,
    createdAt: daysAgo(12), assignedAt: daysAgo(11), collectedAt: daysAgo(10), completedAt: daysAgo(10), updatedAt: daysAgo(10),
    history: [hist('ASSIGNED', a.admin, `Assigned to ${a.collector.name}`, 11), hist('ACCEPTED', a.collector, 'Collector accepted the pickup', 11), hist('ON_THE_WAY', a.collector, '', 10), hist('COLLECTED', a.collector, '', 10), hist('COMPLETED', a.collector, '', 10)],
  }));
  batch.set(db.collection('pickupRequests').doc('demo-pickup-2'), pickupBase('demo-pickup-2', a.user, {
    category: 'ewaste', itemName: 'Old laptop and chargers', quantity: 3, unit: 'item', preferredDate: dateISO(0),
    status: 'ASSIGNED', collectorId: a.collector.uid, collectorName: a.collector.name, collectorPhone: a.collector.phone, acceptedByCollector: false,
    createdAt: daysAgo(2), assignedAt: daysAgo(1), updatedAt: daysAgo(1),
    history: [hist('ASSIGNED', a.admin, `Assigned to ${a.collector.name}`, 1)],
  }));
  batch.set(db.collection('pickupRequests').doc('demo-pickup-3'), pickupBase('demo-pickup-3', a.user, {
    category: 'organic', itemName: 'Garden leaves', quantity: 2, unit: 'bag', preferredDate: dateISO(2), status: 'REQUESTED', createdAt: daysAgo(0), updatedAt: daysAgo(0),
  }));
  batch.set(db.collection('pickupRequests').doc('demo-pickup-4'), pickupBase('demo-pickup-4', a.user2, {
    category: 'recyclable', itemName: 'Plastic containers', quantity: 4, unit: 'kg', preferredDate: dateISO(1), status: 'REQUESTED', createdAt: daysAgo(1), updatedAt: daysAgo(1),
  }));

  // Reward for the completed pickup (same deterministic ID the Cloud Function uses)
  batch.set(db.collection('rewardTransactions').doc('PICKUP_demo-pickup-1'), {
    ...demo, rewardId: 'PICKUP_demo-pickup-1', userId: a.user.uid, action: 'RECYCLABLE_PICKUP_COMPLETED', points: 20, referenceId: 'demo-pickup-1',
    label: 'Recyclable pickup completed (Newspapers and cardboard).', createdAt: daysAgo(10),
  });
  batch.set(db.collection('rewardTransactions').doc('SALE_demo-listing-3'), {
    ...demo, rewardId: 'SALE_demo-listing-3', userId: a.user2.uid, action: 'SALE_COMPLETED', points: 30, referenceId: 'demo-listing-3',
    label: 'Recycling/sale completed (Aluminium cans).', createdAt: daysAgo(5),
  });
  batch.update(db.collection('users').doc(a.user.uid), { ecoPoints: 20 });
  batch.update(db.collection('users').doc(a.user2.uid), { ecoPoints: 30 });

  // Marketplace listings
  const listing = (id, seller, extra) => ({
    ...demo, listingId: id, sellerId: seller.uid, sellerName: seller.name, sellerArea: seller.area, wasteId: null, description: '',
    pickupAvailable: true, condition: 'good', buyerId: null, buyerName: null, offerPrice: null, offerMessage: null, history: [], ...extra,
  });
  batch.set(db.collection('wasteListings').doc('demo-listing-1'), listing('demo-listing-1', a.user, {
    itemName: 'Old Samsung smartphone', category: 'ewaste', description: 'Working phone, cracked screen. Charger included.', quantity: 1, unit: 'item', condition: 'fair', expectedPrice: 1200, status: 'AVAILABLE', createdAt: daysAgo(6), updatedAt: daysAgo(6),
  }));
  batch.set(db.collection('wasteListings').doc('demo-listing-2'), listing('demo-listing-2', a.user, {
    itemName: 'Cardboard boxes (moving)', category: 'recyclable', description: 'Clean, dry, flattened boxes.', quantity: 15, unit: 'kg', expectedPrice: 150, status: 'OFFER_RECEIVED',
    buyerId: a.collector.uid, buyerName: a.collector.name, offerPrice: 130, offerMessage: 'Can collect tomorrow morning.', createdAt: daysAgo(4), updatedAt: daysAgo(1),
    history: [hist('OFFER_RECEIVED', a.collector, `Offer of Rs. 130 by ${a.collector.name}`, 1)],
  }));
  batch.set(db.collection('wasteListings').doc('demo-listing-3'), listing('demo-listing-3', a.user2, {
    itemName: 'Aluminium cans', category: 'recyclable', quantity: 3, unit: 'kg', expectedPrice: 400, status: 'SOLD',
    buyerId: a.collector2.uid, buyerName: a.collector2.name, offerPrice: 420, createdAt: daysAgo(9), updatedAt: daysAgo(5), soldAt: daysAgo(5),
    history: [hist('OFFER_RECEIVED', a.collector2, 'Offer of Rs. 420', 8), hist('ACCEPTED', a.user2, 'Seller accepted the offer', 7), hist('SOLD', a.user2, 'Sale / collection completed', 5)],
  }));
  batch.set(db.collection('wasteListings').doc('demo-listing-3').collection('private').doc('arrangement'), {
    ...demo, sellerId: a.user2.uid, sellerName: a.user2.name, sellerPhone: a.user2.phone, sellerAddress: a.user2.address,
    buyerId: a.collector2.uid, buyerName: a.collector2.name, buyerPhone: a.collector2.phone, buyerEmail: a.collector2.email, agreedPrice: 420, createdAt: daysAgo(7),
  });

  // Partners
  [
    { id: 'demo-partner-1', name: 'E-Parisaraa Recyclers (Demo)', type: 'E-Waste Recycler', categories: ['ewaste', 'hazardous'], serviceArea: 'Bengaluru', active: true },
    { id: 'demo-partner-2', name: 'PlastiCycle India (Demo)', type: 'Plastic Recycler', categories: ['recyclable'], serviceArea: 'Koramangala, HSR Layout', active: true },
    { id: 'demo-partner-3', name: 'MetalWorks Scrap Co. (Demo)', type: 'Metal Recycler', categories: ['recyclable'], serviceArea: 'BTM Layout', active: true },
    { id: 'demo-partner-4', name: 'Old Paper Mart (Demo)', type: 'Paper Recycler', categories: ['recyclable'], serviceArea: 'Indiranagar', active: false },
  ].forEach((p, i) =>
    batch.set(db.collection('partners').doc(p.id), {
      ...demo, ...p, phone: `08040000${10 + i}`, email: `contact${i + 1}@partner.example.com`, address: `${10 + i}, Industrial Area, Bengaluru`, createdAt: daysAgo(30), updatedAt: daysAgo(30),
    }),
  );

  // Complaints
  batch.set(db.collection('complaints').doc('demo-complaint-1'), {
    ...demo, complaintId: 'demo-complaint-1', userId: a.user.uid, userName: a.user.name, type: 'overflowing_garbage', typeLabel: 'Overflowing garbage',
    description: 'Community bin near the park has been overflowing for three days.', address: '6th Main, Koramangala, near the park',
    status: 'SUBMITTED', createdAt: daysAgo(2), updatedAt: daysAgo(2),
  });
  batch.set(db.collection('complaints').doc('demo-complaint-2'), {
    ...demo, complaintId: 'demo-complaint-2', userId: a.user2.uid, userName: a.user2.name, type: 'waste_burning', typeLabel: 'Waste burning',
    description: 'Someone is burning plastic waste in the empty plot every evening.', address: 'Sector 3, HSR Layout',
    status: 'UNDER_REVIEW', adminNote: 'Forwarded to the ward office.', createdAt: daysAgo(5), updatedAt: daysAgo(4),
  });

  // Notifications
  [
    { userId: a.user.uid, title: 'Pickup assigned', message: `Your pickup request has been assigned to ${a.collector.name}.`, type: 'pickup', link: '/pickups', days: 1 },
    { userId: a.user.uid, title: 'New offer received', message: `${a.collector.name} offered Rs. 130 for "Cardboard boxes (moving)".`, type: 'listing', link: '/marketplace/demo-listing-2', days: 1 },
    { userId: a.user.uid, title: 'EcoPoints earned', message: 'You earned 20 EcoPoints. Recyclable pickup completed (Newspapers and cardboard).', type: 'reward', link: '/eco-points', days: 10, read: true },
    { userId: a.collector.uid, title: 'New pickup assigned', message: 'E-Waste pickup (Old laptop and chargers) today.', type: 'pickup', link: '/collector/assigned', days: 1 },
  ].forEach((n) =>
    batch.set(db.collection('notifications').doc(), {
      ...demo, userId: n.userId, title: n.title, message: n.message, type: n.type, link: n.link, read: Boolean(n.read), createdAt: daysAgo(n.days),
    }),
  );

  await batch.commit();
  console.log('✔ Demo data written (all documents have isDemo: true)');
}

async function removeDemo() {
  for (const name of DEMO_COLLECTIONS) {
    const snap = await db.collection(name).where('isDemo', '==', true).get();
    for (const d of snap.docs) {
      if (name === 'wasteListings') await db.recursiveDelete(d.ref);
      else await d.ref.delete();
    }
    console.log(`  removed ${snap.size} demo docs from ${name}`);
  }
  for (const account of DEMO_ACCOUNTS) {
    try {
      const user = await auth.getUserByEmail(account.email);
      const notes = await db.collection('notifications').where('userId', '==', user.uid).get();
      await Promise.all(notes.docs.map((d) => d.ref.delete()));
      await db.collection('users').doc(user.uid).delete();
      await auth.deleteUser(user.uid);
    } catch {
      // account does not exist
    }
  }
  console.log('✔ Demo accounts and data removed');
}

async function main() {
  console.log(`Target: ${useEmulator ? 'LOCAL EMULATOR' : 'REAL PROJECT'} (${projectId})`);
  if (!wantConfig && !wantDemo && !clearDemo) {
    console.log('Nothing to do. Use --config, --demo and/or --clear-demo (add --emulator for local).');
    return;
  }
  if ((wantDemo || clearDemo) && !useEmulator && !args.includes('--allow-production')) {
    throw new Error('Refusing to touch demo data on a real project. Use --emulator, or add --allow-production if you really mean it.');
  }
  if (clearDemo) await removeDemo();
  if (wantConfig) await seedConfig();
  if (wantDemo) await seedDemo();
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('✖', error.message);
    process.exit(1);
  });
