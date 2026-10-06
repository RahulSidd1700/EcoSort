// Simple, explainable ESTIMATES of environmental impact.
// Values are approximations based on configurable conversion factors.
import { DEFAULT_IMPACT, ECO_LEVELS } from './constants';

export function toKg(quantity, unit, factors = DEFAULT_IMPACT) {
  const q = Number(quantity) || 0;
  switch (unit) {
    case 'kg':
      return q;
    case 'g':
      return q / 1000;
    case 'bag':
      return q * (Number(factors.kgPerBag) || DEFAULT_IMPACT.kgPerBag);
    default:
      return q * (Number(factors.kgPerItem) || DEFAULT_IMPACT.kgPerItem);
  }
}

export function getEcoLevel(points = 0) {
  const level = ECO_LEVELS.find((l) => points >= l.min && points <= l.max) || ECO_LEVELS[0];
  const next = ECO_LEVELS[ECO_LEVELS.indexOf(level) + 1];
  const progress = next ? Math.round(((points - level.min) / (next.min - level.min)) * 100) : 100;
  return { ...level, next, progress, pointsToNext: next ? next.min - points : 0 };
}

const round = (n) => Math.round(n * 10) / 10;

/** Computes user statistics from pickups and listings (no duplicated counters). */
export function computeImpact({ pickups = [], listings = [], wasteItems = [] }, factors = DEFAULT_IMPACT) {
  const co2 = { ...DEFAULT_IMPACT.co2PerKg, ...(factors.co2PerKg || {}) };
  const submitted = [
    ...pickups.filter((p) => p.status !== 'CANCELLED'),
    ...listings.filter((l) => l.status !== 'CANCELLED'),
  ];
  const diverted = [...pickups.filter((p) => p.status === 'COMPLETED'), ...listings.filter((l) => l.status === 'SOLD')];

  const sumKg = (list, category) =>
    list.filter((x) => !category || x.category === category).reduce((s, x) => s + toKg(x.quantity, x.unit, factors), 0);

  const byCategory = {};
  diverted.forEach((x) => {
    byCategory[x.category] = (byCategory[x.category] || 0) + toKg(x.quantity, x.unit, factors);
  });
  const co2Saved = Object.entries(byCategory).reduce((s, [cat, kg]) => s + kg * (Number(co2[cat]) || 0), 0);

  return {
    submittedKg: round(sumKg(submitted)),
    recyclableKg: round(sumKg(submitted, 'recyclable')),
    ewasteKg: round(sumKg(submitted, 'ewaste')),
    divertedKg: round(sumKg(diverted)),
    divertedRecyclableKg: round(sumKg(diverted, 'recyclable')),
    divertedEwasteKg: round(sumKg(diverted, 'ewaste')),
    co2SavedKg: round(co2Saved),
    responsibleActions: diverted.length,
    identifiedItems: wasteItems.length,
    pickupCount: pickups.length,
    completedPickups: pickups.filter((p) => p.status === 'COMPLETED').length,
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, round(v)])),
  };
}
