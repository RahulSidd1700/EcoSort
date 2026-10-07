// Central list of categories, statuses and default settings.
// Defaults are used when the matching Firestore settings document is missing.

export const CATEGORIES = [
  {
    id: 'recyclable',
    label: 'Recyclable',
    color: '#2563eb',
    badge: 'bg-blue-100 text-blue-800',
    emoji: '♻️',
    description: 'Clean, dry materials that can be processed into new products.',
    examples: ['Paper', 'Cardboard', 'Plastic bottles', 'Metal cans', 'Glass'],
    action: 'Clean and dry the item, then place it in recyclable waste or submit it for recycling.',
  },
  {
    id: 'organic',
    label: 'Organic',
    color: '#16a34a',
    badge: 'bg-green-100 text-green-800',
    emoji: '🌱',
    description: 'Biodegradable waste that can be composted.',
    examples: ['Food waste', 'Vegetable waste', 'Fruit waste', 'Garden waste'],
    action: 'Consider composting or organic-waste collection.',
  },
  {
    id: 'ewaste',
    label: 'E-Waste',
    color: '#9333ea',
    badge: 'bg-purple-100 text-purple-800',
    emoji: '💻',
    description: 'Discarded electrical and electronic equipment.',
    examples: ['Mobile phones', 'Laptops', 'Chargers', 'Keyboards', 'Electronic devices', 'Batteries'],
    action: 'Treat as e-waste. Do not dispose of it with normal household waste. Use an authorised e-waste collector.',
  },
  {
    id: 'hazardous',
    label: 'Hazardous',
    color: '#dc2626',
    badge: 'bg-red-100 text-red-800',
    emoji: '⚠️',
    description: 'Materials that can harm people or the environment if handled incorrectly.',
    examples: ['Batteries', 'Chemicals', 'Paint containers', 'Other hazardous household materials'],
    action: 'Use an appropriate specialised collection service. Never burn, bury or pour it into drains.',
  },
  {
    id: 'non_recyclable',
    label: 'Non-Recyclable',
    color: '#6b7280',
    badge: 'bg-gray-200 text-gray-800',
    emoji: '🗑️',
    description: 'Waste that cannot be recycled easily.',
    examples: ['Dirty tissues', 'Contaminated materials', 'Mixed waste that cannot be recycled easily'],
    action: 'Place it in general waste. Keep it separate from recyclable and organic waste.',
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const SELLABLE_CATEGORIES = ['recyclable', 'ewaste'];
export const categoryLabel = (id) => CATEGORY_MAP[id]?.label || id || '-';

export const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'item', label: 'Items / pieces' },
  { value: 'bag', label: 'Bags' },
];

export const CONDITIONS = [
  { value: 'new', label: 'New / Unused' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'scrap', label: 'Scrap only' },
];

export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8 AM - 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
  { value: 'evening', label: 'Evening (4 PM - 7 PM)' },
];

export const PICKUP_STEPS = [
  { status: 'REQUESTED', label: 'Request Submitted' },
  { status: 'ASSIGNED', label: 'Collector Assigned' },
  { status: 'ON_THE_WAY', label: 'On The Way' },
  { status: 'COLLECTED', label: 'Waste Collected' },
  { status: 'COMPLETED', label: 'Completed' },
];

export const PICKUP_STATUSES = [...PICKUP_STEPS.map((s) => s.status), 'CANCELLED'];
export const LISTING_STATUSES = ['AVAILABLE', 'OFFER_RECEIVED', 'ACCEPTED', 'SOLD', 'CANCELLED'];
export const COMPLAINT_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'RESOLVED', 'REJECTED'];

export const COMPLAINT_TYPES = [
  { value: 'illegal_dumping', label: 'Illegal dumping' },
  { value: 'overflowing_garbage', label: 'Overflowing garbage' },
  { value: 'waste_burning', label: 'Waste burning' },
  { value: 'uncollected_waste', label: 'Uncollected waste' },
  { value: 'other', label: 'Other' },
];

export const PARTNER_TYPES = [
  'E-Waste Recycler',
  'Plastic Recycler',
  'Metal Recycler',
  'Paper Recycler',
  'General Recycling Partner',
];

export const ROLES = ['user', 'collector', 'admin'];

export const DEFAULT_REWARDS = {
  recyclablePickup: 20,
  ewastePickup: 50,
  otherPickup: 10,
  saleCompleted: 30,
  verifiedComplaint: 15,
};

export const REWARD_LABELS = {
  recyclablePickup: 'Recyclable pickup completed',
  ewastePickup: 'E-waste pickup completed',
  otherPickup: 'Other pickup completed (organic / hazardous / general)',
  saleCompleted: 'Recycling / sale completed',
  verifiedComplaint: 'Verified waste complaint',
};

export const ECO_LEVELS = [
  { name: 'Eco Starter', min: 0, max: 99, emoji: '🌱' },
  { name: 'Green Explorer', min: 100, max: 249, emoji: '🌿' },
  { name: 'Eco Guardian', min: 250, max: 499, emoji: '🌳' },
  { name: 'Green Champion', min: 500, max: Infinity, emoji: '🏆' },
];

// Sample value rates (INR per kg) - NOT live market prices.
export const DEFAULT_RATES = {
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
};

// Conversion factors used for ESTIMATED environmental impact.
export const DEFAULT_IMPACT = {
  kgPerItem: 0.5, // assumed average weight of one item
  kgPerBag: 5, // assumed average weight of one bag
  co2PerKg: { recyclable: 1.5, ewaste: 2.0, organic: 0.5, hazardous: 0.3, non_recyclable: 0.1 },
};

export const LOW_CONFIDENCE = 0.6;
