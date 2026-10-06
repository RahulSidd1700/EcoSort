import { useState } from 'react';
import { Plus, Store } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import ListingCard from '../../components/ListingCard';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeListings } from '../../services/listingService';
import { CATEGORY_MAP, LISTING_STATUSES, SELLABLE_CATEGORIES } from '../../utils/constants';
import { formatStatus } from '../../utils/format';

export default function Marketplace() {
  const { role, profile } = useAuth();
  const { data, loading, error } = useRealtime((ok, fail) => subscribeListings(ok, fail), []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  const term = search.trim().toLowerCase();
  const listings = data.filter((l) => {
    if (category && l.category !== category) return false;
    if (status ? l.status !== status : l.status === 'CANCELLED') return false;
    if (mineOnly && l.buyerId !== profile.uid && l.sellerId !== profile.uid) return false;
    if (term && !`${l.itemName} ${l.description || ''} ${l.sellerArea || ''}`.toLowerCase().includes(term))
      return false;
    return true;
  });

  return (
    <div className="fade-in">
      <PageHeader
        title="Marketplace"
        subtitle={
          role === 'collector'
            ? 'Browse recyclable materials and e-waste listed by users and make an offer.'
            : 'Recyclable materials and e-waste available for sale / collection arrangement.'
        }
        actions={
          role === 'user' && (
            <Button icon={Plus} to="/sell/new">
              Create Listing
            </Button>
          )
        }
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search item, description or area..."
        filters={[
          {
            label: 'Categories',
            value: category,
            onChange: setCategory,
            options: SELLABLE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_MAP[c].label })),
          },
          {
            label: 'Statuses',
            value: status,
            onChange: setStatus,
            allLabel: 'All (except cancelled)',
            options: LISTING_STATUSES.map((s) => ({ value: s, label: formatStatus(s) })),
          },
        ]}
      >
        {role !== 'admin' && (
          <label className="flex items-center gap-2 text-sm whitespace-nowrap text-slate-600">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="accent-brand-600"
            />
            {role === 'collector' ? 'My offers only' : 'My listings only'}
          </label>
        )}
      </FilterBar>
      <Alert type="error" className="mb-4">
        {error}
      </Alert>

      {loading ? (
        <CardGridSkeleton count={6} className="h-72" />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No marketplace listings found."
          message={data.length ? 'Try changing the search or filters.' : 'Listings created by users will appear here.'}
          actionLabel={role === 'user' ? 'Create Listing' : undefined}
          actionTo="/sell/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
