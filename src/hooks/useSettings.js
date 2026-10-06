import { useRealtime } from './useRealtime';
import { subscribeSetting } from '../services/adminService';
import { DEFAULT_IMPACT, DEFAULT_RATES, DEFAULT_REWARDS } from '../utils/constants';

const DEFAULTS = { rewards: DEFAULT_REWARDS, rates: DEFAULT_RATES, impact: DEFAULT_IMPACT };

/** Reads an admin-configurable settings document, falling back to defaults. */
export function useSetting(id) {
  const { data, loading } = useRealtime((ok, fail) => subscribeSetting(id, ok, fail), [id], true, null);
  return { value: { ...DEFAULTS[id], ...(data || {}) }, loading };
}
