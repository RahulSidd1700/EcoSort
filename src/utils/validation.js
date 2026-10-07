import { todayISO } from './format';

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const isPhone = (v) => /^[0-9+\-\s]{7,20}$/.test(String(v || '').trim());

/**
 * Tiny rule-based validator.
 * rules: { field: [ [checkFn, 'message'], ... ] } - first failing check wins.
 */
export function validate(values, rules) {
  const errors = {};
  Object.entries(rules).forEach(([field, checks]) => {
    for (const [check, message] of checks) {
      if (!check(values[field], values)) {
        errors[field] = message;
        break;
      }
    }
  });
  return errors;
}

export const required = (v) => String(v ?? '').trim().length > 0;
export const minLen = (n) => (v) => String(v ?? '').trim().length >= n;
export const maxLen = (n) => (v) => String(v ?? '').trim().length <= n;
export const positiveNumber = (v) => Number(v) > 0 && Number(v) <= 100000;
export const nonNegativeNumber = (v) => v !== '' && Number(v) >= 0 && Number.isFinite(Number(v));
export const notPastDate = (v) => Boolean(v) && v >= todayISO();
