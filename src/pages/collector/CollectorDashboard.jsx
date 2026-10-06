import { useState } from 'react';
import { Truck, Clock, CircleCheck, Calendar } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { StatCard } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton, ListSkeleton } from '../../components/ui/Skeleton';
import PickupCard from '../../components/PickupCard';
import CollectorActions from '../../components/CollectorActions';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeCollectorPickups } from '../../services/pickupService';
import { todayISO } from '../../utils/format';

const PENDING = ['ASSIGNED', 'ON_THE_WAY', 'COLLECTED'];

export default function CollectorDashboard() {
  const { profile } = useAuth();
  const { data, loading, error } = useRealtime(
    (ok, fail) => subscribeCollectorPickups(profile.uid, ok, fail),
    [profile.uid],
  );
  const [message, setMessage] = useState({ type: '', text: '' });
  const today = todayISO();
  const pending = data.filter((p) => PENDING.includes(p.status));
  const todays = pending.filter((p) => p.preferredDate === today);
  const upcoming = [...pending].sort((a, b) => a.preferredDate.localeCompare(b.preferredDate)).slice(0, 3);

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title={`Hello, ${profile.name?.split(' ')[0]} 👋`}
        subtitle="Your collection work at a glance."
        actions={
          <Button icon={Truck} to="/collector/assigned">
            All assigned pickups
          </Button>
        }
      />
      <Alert type="error">{error}</Alert>
      <Alert type={message.type || 'info'}>{message.text}</Alert>
      {loading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Truck} label="Total assigned pickups" value={data.length} />
          <StatCard icon={Clock} label="Pending pickups" value={pending.length} color="bg-amber-50 text-amber-700" />
          <StatCard
            icon={CircleCheck}
            label="Completed pickups"
            value={data.filter((p) => p.status === 'COMPLETED').length}
            color="bg-green-50 text-green-700"
          />
          <StatCard icon={Calendar} label="Today's pickups" value={todays.length} color="bg-sky-50 text-sky-700" />
        </div>
      )}
      <Card title={todays.length ? "Today's pickups" : 'Next pickups'}>
        {loading ? (
          <ListSkeleton rows={2} />
        ) : (todays.length ? todays : upcoming).length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No pending pickups"
            message="New pickups assigned by the admin will appear here."
          />
        ) : (
          <div className="space-y-4">
            {(todays.length ? todays : upcoming).map((p) => (
              <PickupCard
                key={p.id}
                pickup={p}
                showUser
                showTimeline={false}
                actions={<CollectorActions pickup={p} onMessage={setMessage} />}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
