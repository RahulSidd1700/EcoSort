import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import StatusBadge, { CategoryBadge } from './ui/StatusBadge';
import { CATEGORY_MAP } from '../utils/constants';
import { formatINR } from '../utils/format';

export default function ListingCard({ listing, children }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/marketplace/${listing.id}`} className="block">
        <div className="flex h-44 items-center justify-center bg-slate-100 text-5xl" aria-hidden="true">
          {CATEGORY_MAP[listing.category]?.emoji}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/marketplace/${listing.id}`} className="font-semibold text-slate-800 hover:text-brand-700">
            {listing.itemName}
          </Link>
          <StatusBadge status={listing.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={listing.category} />
          {listing.isDemo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Demo</span>}
        </div>
        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-slate-500">Quantity</dt>
          <dd className="text-right font-medium">
            {listing.quantity} {listing.unit}
          </dd>
          <dt className="text-slate-500">Expected price</dt>
          <dd className="text-right font-medium">{formatINR(listing.expectedPrice)}</dd>
        </dl>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={14} aria-hidden="true" /> {listing.sellerArea || 'Area not specified'}
        </p>
        {children && <div className="mt-auto flex flex-wrap gap-2 pt-2">{children}</div>}
      </div>
    </article>
  );
}
