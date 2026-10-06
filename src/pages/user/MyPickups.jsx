import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Truck, Ban } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import PickupCard from '../../components/PickupCard';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeUserPickups, updatePickupStatus } from '../../services/pickupService';
import { CATEGORIES, PICKUP_STATUSES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatStatus, sortByDateDesc } from '../../utils/format';

export default function MyPickups() {
  const { profile } = useAuth();
  const location = useLocation();
  const { data, loading, error } = useRealtime(
    (ok, fail) => subscribeUserPickups(profile.uid, ok, fail),
    [profile.uid],
  );
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState({
    type: location.state?.message ? 'success' : '',
    text: location.state?.message || '',
  });

  const pickups = sortByDateDesc(data).filter(
    (p) =>
      (!status || p.status === status) && (!category || p.category === category) && (!date || p.preferredDate === date),
  );

  const cancel = async (pickup) => {
    if (!window.confirm(`Cancel pickup for "${pickup.itemName}"?`)) return;
    setBusyId(pickup.id);
    try {
      await updatePickupStatus(pickup.id, 'cancel');
      setMessage({ type: 'success', text: 'Pickup request cancelled.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not cancel the pickup.') });
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="My Pickups"
        subtitle="Track your pickup requests in real time."
        actions={
          <Button icon={Plus} to="/pickups/new">
            Request Pickup
          </Button>
        }
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <FilterBar
        filters={[
          {
            label: 'Statuses',
            value: status,
            onChange: setStatus,
            options: PICKUP_STATUSES.map((s) => ({ value: s, label: formatStatus(s) })),
          },
          {
            label: 'Categories',
            value: category,
            onChange: setCategory,
            options: CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
          },
        ]}
      >
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">Preferred date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </FilterBar>
      <Alert type="error" className="mb-4">
        {error}
      </Alert>

      {loading ? (
        <ListSkeleton />
      ) : pickups.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No pickup requests yet."
          message={data.length ? 'No pickups match the selected filters.' : 'Request a pickup and track it here.'}
          actionLabel="Request Pickup"
          actionTo="/pickups/new"
        />
      ) : (
        <div className="space-y-4">
          {pickups.map((p) => (
            <PickupCard
              key={p.id}
              pickup={p}
              actions={
                ['REQUESTED', 'ASSIGNED'].includes(p.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    icon={Ban}
                    loading={busyId === p.id}
                    onClick={() => cancel(p)}
                  >
                    Cancel request
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
