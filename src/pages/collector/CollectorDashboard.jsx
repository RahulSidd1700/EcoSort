
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
  const { profile, loading: authLoading, profileError } = useAuth();

  const profileUid = profile?.uid;

  const {
    data = [],
    loading: pickupsLoading,
    error,
  } = useRealtime(
    (ok, fail) => {
      if (!profileUid) return () => {};

      return subscribeCollectorPickups(profileUid, ok, fail);
    },
    [profileUid],
  );

  const [message, setMessage] = useState({ type: '', text: '' });

  // Avoid rendering profile-dependent UI before the profile loads.
  if (authLoading || (!profileUid && !profileError)) {
    return <CardGridSkeleton count={4} />;
  }

  if (!profileUid || profileError) {
    return (
      <div className="space-y-4">
        <Alert type="error">
          {profileError || 'Unable to load your collector profile. Please refresh.'}
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const today = todayISO();
  const pending = data.filter((p) => PENDING.includes(p.status));
  const todays = pending.filter((p) => p.preferredDate === today);

  const upcoming = [...pending]
    .sort((a, b) =>
      (a.preferredDate || '').localeCompare(b.preferredDate || '')
    )
    .slice(0, 3);

  const displayedPickups = todays.length ? todays : upcoming;

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title={`Hello, ${profile.name?.split(' ')[0] || 'Collector'} 👋`}
        subtitle="Your collection work at a glance."
        actions={
          <Button icon={Truck} to="/collector/assigned">
            All assigned pickups
          </Button>
        }
      />

      <Alert type="error">{error}</Alert>
      <Alert type={message.type || 'info'}>{message.text}</Alert>

      {pickupsLoading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Truck}
            label="Total assigned pickups"
            value={data.length}
          />

          <StatCard
            icon={Clock}
            label="Pending pickups"
            value={pending.length}
            color="bg-amber-50 text-amber-700"
          />

          <StatCard
            icon={CircleCheck}
            label="Completed pickups"
            value={data.filter((p) => p.status === 'COMPLETED').length}
            color="bg-green-50 text-green-700"
          />

          <StatCard
            icon={Calendar}
            label="Today's pickups"
            value={todays.length}
            color="bg-sky-50 text-sky-700"
          />
        </div>
      )}

      <Card title={todays.length ? "Today's pickups" : 'Next pickups'}>
        {pickupsLoading ? (
          <ListSkeleton rows={2} />
        ) : displayedPickups.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No pending pickups"
            message="New pickups assigned by the admin will appear here."
          />
        ) : (
          <div className="space-y-4">
            {displayedPickups.map((p) => (
              <PickupCard
                key={p.id}
                pickup={p}
                showUser
                showTimeline={false}
                actions={
                  <CollectorActions
                    pickup={p}
                    onMessage={setMessage}
                  />
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
