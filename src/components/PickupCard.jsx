import { MapPin, Calendar, Package, User, Phone } from 'lucide-react';
import StatusBadge, { CategoryBadge } from './ui/StatusBadge';
import PickupTimeline from './PickupTimeline';
import { TIME_SLOTS } from '../utils/constants';
import { formatDate, shortId } from '../utils/format';

/** Pickup summary card used by users, collectors and admins. `actions` renders buttons. */
export default function PickupCard({ pickup, showTimeline = true, showUser = false, actions }) {
  const slot = TIME_SLOTS.find((t) => t.value === pickup.preferredTime)?.label || pickup.preferredTime;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400">Pickup {shortId(pickup.id)}</p>
          <h3 className="text-lg font-semibold">{pickup.itemName}</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            <CategoryBadge category={pickup.category} />
            {pickup.isDemo && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Demo</span>
            )}
          </div>
        </div>
        <StatusBadge status={pickup.status} />
      </div>
      <div className={`mt-4 grid gap-5 ${showTimeline ? 'md:grid-cols-2' : ''}`}>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <Package size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Quantity</dt>
            <dd>
              {pickup.quantity} {pickup.unit}
            </dd>
          </div>
          <div className="flex gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Address</dt>
            <dd>
              {pickup.address}
              {pickup.landmark && ` (Landmark: ${pickup.landmark})`}
            </dd>
          </div>
          <div className="flex gap-2">
            <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Preferred date</dt>
            <dd>
              {formatDate(pickup.preferredDate)} · {slot}
            </dd>
          </div>
          {showUser && (
            <div className="flex gap-2">
              <User size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <dt className="sr-only">User</dt>
              <dd>
                {pickup.userName}
                {pickup.userPhone && (
                  <>
                    {' '}
                    ·{' '}
                    <a className="text-brand-700 hover:underline" href={`tel:${pickup.userPhone}`}>
                      <Phone size={12} className="inline" aria-hidden="true" /> {pickup.userPhone}
                    </a>
                  </>
                )}
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <User size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="text-slate-500">Collector:</dt>
            <dd>
              {pickup.collectorName || 'Not assigned yet'}
              {pickup.acceptedByCollector && pickup.status === 'ASSIGNED' && ' (accepted)'}
            </dd>
          </div>
          {pickup.notes && <p className="rounded-lg bg-slate-50 p-2 text-slate-600">Notes: {pickup.notes}</p>}
        </dl>
        {showTimeline && <PickupTimeline pickup={pickup} />}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{actions}</div>}
    </article>
  );
}
