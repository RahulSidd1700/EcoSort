import { Package, Recycle, Smartphone, Truck, Award, CircleCheck, ScanSearch, Tag, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import EcoLevelCard from '../../components/EcoLevelCard';
import CategoryChart from '../../components/charts/CategoryChart';
import { useAuth } from '../../hooks/useAuth';
import { useUserActivity } from '../../hooks/useUserActivity';
import { useSetting } from '../../hooks/useSettings';
import { computeImpact } from '../../utils/impact';
import { timeAgo, toDate } from '../../utils/format';

function buildActivities({ wasteItems, pickups, listings, rewards }) {
  const items = [
    ...wasteItems.map((w) => ({
      id: `w${w.id}`,
      at: w.createdAt,
      text: `Identified "${w.itemName}"`,
      category: w.category,
      link: '/identify',
    })),
    ...pickups.map((p) => ({
      id: `p${p.id}`,
      at: p.updatedAt || p.createdAt,
      text: `Pickup for "${p.itemName}"`,
      status: p.status,
      link: '/pickups',
    })),
    ...listings.map((l) => ({
      id: `l${l.id}`,
      at: l.updatedAt || l.createdAt,
      text: `Listing "${l.itemName}"`,
      status: l.status,
      link: `/marketplace/${l.id}`,
    })),
    ...rewards.map((r) => ({
      id: `r${r.id}`,
      at: r.createdAt,
      text: `Earned ${r.points} EcoPoints`,
      link: '/eco-points',
    })),
  ];
  return items.sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0)).slice(0, 7);
}

export default function UserDashboard() {
  const { profile } = useAuth();
  const activity = useUserActivity(profile.uid);
  const { value: factors } = useSetting('impact');
  const stats = computeImpact(activity, factors);
  const categoryCounts = activity.wasteItems.reduce(
    (acc, w) => ({ ...acc, [w.category]: (acc[w.category] || 0) + 1 }),
    {},
  );
  const activities = buildActivities(activity);

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title={`Welcome, ${profile.name?.split(' ')[0] || 'friend'} 👋`}
        subtitle="Here is a summary of your waste management activity."
        actions={
          <>
            <Button icon={ScanSearch} to="/identify">
              Identify Waste
            </Button>
            <Button icon={Truck} variant="outline" to="/pickups/new">
              Request Pickup
            </Button>
          </>
        }
      />
      <Alert type="error">{activity.error}</Alert>

      {activity.loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Package}
            label="Total Waste Submitted"
            value={`${stats.submittedKg} kg`}
            hint={`Estimated · ${stats.identifiedItems} items identified`}
          />
          <StatCard
            icon={Recycle}
            label="Recyclable Waste"
            value={`${stats.recyclableKg} kg`}
            hint="Estimated"
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            icon={Smartphone}
            label="E-Waste"
            value={`${stats.ewasteKg} kg`}
            hint="Estimated"
            color="bg-purple-50 text-purple-700"
          />
          <StatCard icon={Truck} label="Pickup Requests" value={stats.pickupCount} color="bg-amber-50 text-amber-700" />
          <StatCard
            icon={Award}
            label="EcoPoints"
            value={profile.ecoPoints || 0}
            color="bg-yellow-50 text-yellow-700"
          />
          <StatCard
            icon={CircleCheck}
            label="Completed Pickups"
            value={stats.completedPickups}
            color="bg-green-50 text-green-700"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <EcoLevelCard points={profile.ecoPoints || 0} />
        <Card
          title="Your Environmental Impact"
          className="lg:col-span-2"
          action={
            <Link to="/impact" className="text-sm font-medium text-brand-700 hover:underline">
              Details
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Waste Diverted</p>
              <p className="text-xl font-bold">{stats.divertedKg} kg</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Recyclable Waste</p>
              <p className="text-xl font-bold">{stats.divertedRecyclableKg} kg</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">E-Waste</p>
              <p className="text-xl font-bold">{stats.divertedEwasteKg} kg</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">EcoPoints</p>
              <p className="text-xl font-bold">{profile.ecoPoints || 0}</p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
            <Leaf size={14} aria-hidden="true" /> Estimated impact based on completed pickups and sales. Values are
            approximate, not exact measurements.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Waste records by category">
          <CategoryChart counts={categoryCounts} />
        </Card>
        <Card title="Recent activity">
          {activities.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">No activity yet. Start by identifying your first waste item.</p>
              <Button className="mt-3" size="sm" icon={ScanSearch} to="/identify">
                Identify Waste
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link to={a.link} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">{a.text}</p>
                      <p className="text-xs text-slate-400">{timeAgo(a.at)}</p>
                    </div>
                    {a.status ? (
                      <StatusBadge status={a.status} />
                    ) : a.category ? (
                      <CategoryBadge category={a.category} />
                    ) : (
                      <Tag size={16} className="text-yellow-500" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
