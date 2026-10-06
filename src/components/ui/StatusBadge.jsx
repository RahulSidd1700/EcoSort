import { CATEGORY_MAP } from '../../utils/constants';
import { formatStatus } from '../../utils/format';

const COLORS = {
  // pickups
  REQUESTED: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-sky-100 text-sky-800',
  ON_THE_WAY: 'bg-indigo-100 text-indigo-800',
  COLLECTED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
  // listings
  AVAILABLE: 'bg-green-100 text-green-800',
  OFFER_RECEIVED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-sky-100 text-sky-800',
  SOLD: 'bg-purple-100 text-purple-800',
  // complaints
  SUBMITTED: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  // generic
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const c = CATEGORY_MAP[category];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c?.badge || 'bg-slate-100 text-slate-700'}`}
    >
      <span aria-hidden="true">{c?.emoji}</span>
      {c?.label || category}
    </span>
  );
}
