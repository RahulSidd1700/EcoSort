const ACTIVE = ['ASSIGNED', 'ON_THE_WAY', 'COLLECTED'];

/**
 * Simple, explainable collector suggestion (not AI):
 *   +100 if one of the collector's service areas appears in the pickup address
 *   +50  if the collector is marked available
 *   -10  for every pickup the collector is currently handling
 * Returns active collectors sorted best-first with the reasons.
 */
export function rankCollectors(pickup, collectors, pickups) {
  const address = `${pickup.address || ''} ${pickup.landmark || ''}`.toLowerCase();
  return collectors
    .filter((c) => c.active !== false)
    .map((c) => {
      const areaMatch = (c.serviceAreas || []).some((a) => a && address.includes(a.toLowerCase()));
      const load = pickups.filter((p) => p.collectorId === c.id && ACTIVE.includes(p.status)).length;
      const score = (areaMatch ? 100 : 0) + (c.available ? 50 : 0) - load * 10;
      return { collector: c, areaMatch, available: Boolean(c.available), load, score };
    })
    .sort((a, b) => b.score - a.score);
}
