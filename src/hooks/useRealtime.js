import { useEffect, useState } from 'react';
import { friendlyError } from '../utils/errors';

/**
 * Subscribes to a Firestore listener from a service and exposes
 * { data, loading, error }. Example:
 *   const { data } = useRealtime((ok, fail) => subscribeUserPickups(uid, ok, fail), [uid]);
 * Pass `enabled = false` to skip subscribing (e.g. while uid is not known yet).
 */
export function useRealtime(subscribe, deps = [], enabled = true, initial = []) {
  const [state, setState] = useState({ data: initial, loading: enabled, error: '' });

  useEffect(() => {
    if (!enabled) {
      setState({ data: initial, loading: false, error: '' });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: '' }));
    const unsubscribe = subscribe(
      (data) => setState({ data, loading: false, error: '' }),
      (err) => setState({ data: initial, loading: false, error: friendlyError(err, 'Unable to load data.') }),
    );
    return () => unsubscribe && unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return state;
}
