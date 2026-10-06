// Shared constants for EcoSort Cloud Functions.
// Keep these in sync with src/utils/constants.js in the React app.

export const REGION = 'asia-south1';

export const CATEGORIES = ['recyclable', 'non_recyclable', 'organic', 'ewaste', 'hazardous'];

export const CATEGORY_LABELS = {
  recyclable: 'Recyclable',
  non_recyclable: 'Non-Recyclable',
  organic: 'Organic',
  ewaste: 'E-Waste',
  hazardous: 'Hazardous',
};

export const SELLABLE_CATEGORIES = ['recyclable', 'ewaste'];

// Safe, conservative default disposal advice per category.
export const SAFE_ACTIONS = {
  recyclable:
    'Clean and dry the item, then place it in recyclable waste or submit it for recycling. You can also sell it through the EcoSort marketplace.',
  non_recyclable: 'Place it in general (non-recyclable) waste. Avoid mixing it with recyclable or organic waste.',
  organic: 'Consider home composting or hand it over for organic-waste collection.',
  ewaste:
    'Treat as e-waste. Do not dispose of it with normal household waste. Recycle through an authorised e-waste collector or create a recycling/sale listing.',
  hazardous:
    'Use an appropriate specialised hazardous-waste collection service. Do not burn it, pour it into drains, or mix it with household waste. Keep it sealed and away from children until collection.',
};

export const PICKUP_STATUS = {
  REQUESTED: 'REQUESTED',
  ASSIGNED: 'ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  COLLECTED: 'COLLECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const LISTING_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OFFER_RECEIVED: 'OFFER_RECEIVED',
  ACCEPTED: 'ACCEPTED',
  SOLD: 'SOLD',
  CANCELLED: 'CANCELLED',
};

export const COMPLAINT_STATUS = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'RESOLVED', 'REJECTED'];

// Default EcoPoints. Admin can override them in Firestore: settings/rewards
export const DEFAULT_REWARDS = {
  recyclablePickup: 20,
  ewastePickup: 50,
  otherPickup: 10,
  saleCompleted: 30,
  verifiedComplaint: 15,
};

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
