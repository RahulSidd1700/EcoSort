import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card, { StatCard } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import { Skeleton } from '../../components/ui/Skeleton';
import AdminCharts from '../../components/charts/AdminCharts';
import { useAdminData } from '../../hooks/useAdminData';
import { useSetting } from '../../hooks/useSettings';
import { computeImpact, getEcoLevel } from '../../utils/impact';
import { COMPLAINT_TYPES, LISTING_STATUSES } from '../../utils/constants';
import { formatINR, formatStatus } from '../../utils/format';
import { Leaf, Factory, Store, Sparkles } from 'lucide-react';

export default function AdminAnalytics() {
  const d = useAdminData(['users', 'waste', 'pickups', 'listings', 'complaints']);
  const { value: factors } = useSetting('impact');
  const impact = computeImpact({ pickups: d.pickups, listings: d.listings, wasteItems: d.wasteItems }, factors);
  const aiShare = d.wasteItems.length
    ? Math.round((d.wasteItems.filter((w) => w.source === 'ai').length / d.wasteItems.length) * 100)
    : 0;
  const soldValue = d.listings.filter((l) => l.status === 'SOLD').reduce((s, l) => s + (Number(l.offerPrice) || 0), 0);
  const complaintData = COMPLAINT_TYPES.map((t) => ({
    type: t.label,
    count: d.complaints.filter((c) => c.type === t.value).length,
  }));
  const listingData = LISTING_STATUSES.map((s) => ({
    status: formatStatus(s),
    count: d.listings.filter((l) => l.status === s).length,
  }));
  const leaders = d.users
    .filter((u) => u.role === 'user')
    .sort((a, b) => (b.ecoPoints || 0) - (a.ecoPoints || 0))
    .slice(0, 5);

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Analytics" subtitle="Platform-wide trends. Environmental values are estimates." />
      <Alert type="error">{d.error}</Alert>
      {d.loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Leaf} label="Waste diverted (est.)" value={`${impact.divertedKg} kg`} />
            <StatCard
              icon={Factory}
              label="CO₂e avoided (est.)"
              value={`${impact.co2SavedKg} kg`}
              color="bg-slate-100 text-slate-700"
            />
            <StatCard
              icon={Store}
              label="Marketplace value settled"
              value={formatINR(soldValue)}
              color="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={Sparkles}
              label="AI classifications"
              value={`${aiShare}%`}
              hint={`${d.wasteItems.length} records total`}
              color="bg-purple-50 text-purple-700"
            />
          </div>
          <AdminCharts {...d} factors={factors} />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Complaints by type">
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={complaintData} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="type" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Complaints" fill="#dc2626" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Listings by status">
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={listingData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Listings" fill="#9333ea" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Top EcoPoints earners">
              {leaders.length === 0 ? (
                <p className="text-sm text-slate-500">No users yet.</p>
              ) : (
                <ol className="space-y-2">
                  {leaders.map((u, i) => (
                    <li key={u.id} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="mr-2 font-bold text-slate-400">{i + 1}.</span>
                        {u.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {getEcoLevel(u.ecoPoints).emoji} {u.ecoPoints || 0} pts
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
