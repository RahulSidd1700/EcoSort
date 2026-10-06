import { useRealtime } from './useRealtime';
import { subscribeCategories } from '../services/adminService';
import { CATEGORIES } from '../utils/constants';

/**
 * The five fixed categories, with admin-edited text (description, examples,
 * action) from the Firestore "categories" collection merged on top.
 */
export function useCategories() {
  const { data, loading } = useRealtime((ok, fail) => subscribeCategories(ok, fail), []);
  const categories = CATEGORIES.map((c) => {
    const override = data.find((d) => d.id === c.id) || {};
    return {
      ...c,
      description: override.description || c.description,
      action: override.action || c.action,
      examples: override.examples?.length ? override.examples : c.examples,
    };
  });
  return { categories, map: Object.fromEntries(categories.map((c) => [c.id, c])), loading };
}
