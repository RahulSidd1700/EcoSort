import { useState } from 'react';
import { Truck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import PickupCard from '../../components/PickupCard';
import CollectorActions from '../../components/CollectorActions';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeCollectorPickups } from '../../services/pickupService';
import { CATEGORIES } from '../../utils/constants';
import { formatStatus, sortByDateDesc } from '../../utils/format';

const PENDING = ['ASSIGNED', 'ON_THE_WAY', 'COLLECTED'];

/** mode = "assigned" (active work) or "completed" (history). */
export default function CollectorPickups({ mode }) {
  const { profile } = useAuth();
  const { data, loading, error } = useRealtime(
    (ok, fail) => subscribeCollectorPickups(profile.uid, ok, fail),
    [profile.uid],
  );
  const [message, setMessage] = useState({ type: '', text: '' });
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  const statuses = mode === 'assigned' ? PENDING : ['COMPLETED', 'CANCELLED'];
  const base = data.filter((p) => statuses.includes(p.status));
  const list = (
    mode === 'assigned'
      ? [...base].sort((a, b) => a.preferredDate.localeCompare(b.preferredDate))
      : sortByDateDesc(base, 'updatedAt')
  ).filter(
    (p) =>
      (!status || p.status === status) && (!category || p.category === category) && (!date || p.preferredDate === date),
  );

  return (
    <div className="fade-in">
      <PageHeader
        title={mode === 'assigned' ? 'Assigned Pickups' : 'Completed Pickups'}
        subtitle={
          mode === 'assigned' ? 'Accept each pickup, then update the status at every step.' : 'Your collection history.'
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
            options: statuses.map((s) => ({ value: s, label: formatStatus(s) })),
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
          <span className="whitespace-nowrap">Date</span>
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
      ) : list.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={mode === 'assigned' ? 'No assigned pickups.' : 'No completed pickups yet.'}
          message="Pickups assigned to you by the admin will appear here."
        />
      ) : (
        <div className="space-y-4">
          {list.map((p) => (
            <PickupCard
              key={p.id}
              pickup={p}
              showUser
              actions={mode === 'assigned' && <CollectorActions pickup={p} onMessage={setMessage} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
