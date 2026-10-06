import { Users, Package, Truck, CircleCheck, Clock, Smartphone, Award, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card, { StatCard } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import { CardGridSkeleton, Skeleton } from '../../components/ui/Skeleton';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import AdminCharts from '../../components/charts/AdminCharts';
import { useAdminData } from '../../hooks/useAdminData';
import { useSetting } from '../../hooks/useSettings';
import { toKg } from '../../utils/impact';
import { shortId, timeAgo } from '../../utils/format';

export default function AdminDashboard() {
  const d = useAdminData(['users', 'waste', 'pickups', 'listings', 'complaints']);
  const { value: factors } = useSetting('impact');

  const submitted = [
    ...d.pickups.filter((p) => p.status !== 'CANCELLED'),
    ...d.listings.filter((l) => l.status !== 'CANCELLED'),
  ];
  const totalKg = submitted.reduce((s, x) => s + toKg(x.quantity, x.unit, factors), 0);
  const ewasteKg = submitted
    .filter((x) => x.category === 'ewaste')
    .reduce((s, x) => s + toKg(x.quantity, x.unit, factors), 0);
  const pending = d.pickups.filter((p) => ['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'COLLECTED'].includes(p.status));
  const unassigned = d.pickups.filter((p) => p.status === 'REQUESTED');
  const openComplaints = d.complaints.filter((c) => ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'].includes(c.status));
  const totalPoints = d.users.reduce((s, u) => s + (u.ecoPoints || 0), 0);

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Admin Dashboard" subtitle="Overview of EcoSort activity. All figures update in real time." />
      <Alert type="error">{d.error}</Alert>

      {d.loading ? (
        <CardGridSkeleton count={8} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={d.users.filter((u) => u.role === 'user').length}
            hint={`${d.users.filter((u) => u.role === 'collector').length} collectors`}
          />
          <StatCard
            icon={Package}
            label="Total Waste Submitted"
            value={`${Math.round(totalKg * 10) / 10} kg`}
            hint={`Estimated · ${d.wasteItems.length} items identified`}
            color="bg-blue-50 text-blue-700"
          />
          <StatCard icon={Truck} label="Total Pickups" value={d.pickups.length} color="bg-amber-50 text-amber-700" />
          <StatCard
            icon={CircleCheck}
            label="Completed Pickups"
            value={d.pickups.filter((p) => p.status === 'COMPLETED').length}
            color="bg-green-50 text-green-700"
          />
          <StatCard
            icon={Clock}
            label="Pending Pickups"
            value={pending.length}
            hint={`${unassigned.length} waiting for assignment`}
            color="bg-orange-50 text-orange-700"
          />
          <StatCard
            icon={Smartphone}
            label="Total E-Waste"
            value={`${Math.round(ewasteKg * 10) / 10} kg`}
            hint="Estimated"
            color="bg-purple-50 text-purple-700"
          />
          <StatCard icon={Award} label="Total EcoPoints" value={totalPoints} color="bg-yellow-50 text-yellow-700" />
          <StatCard
            icon={TriangleAlert}
            label="Open Complaints"
            value={openComplaints.length}
            color="bg-red-50 text-red-700"
          />
        </div>
      )}

      {d.loading ? <Skeleton className="h-80 w-full rounded-2xl" /> : <AdminCharts {...d} factors={factors} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Pickups waiting for assignment"
          action={
            <Link to="/admin/pickups" className="text-sm font-medium text-brand-700 hover:underline">
              Manage
            </Link>
          }
        >
          {unassigned.length === 0 ? (
            <p className="text-sm text-slate-500">No pickups waiting. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unassigned.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {shortId(p.id)} · {p.itemName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.userName} · {timeAgo(p.createdAt)}
                    </p>
                  </div>
                  <CategoryBadge category={p.category} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Recent complaints"
          action={
            <Link to="/admin/complaints" className="text-sm font-medium text-brand-700 hover:underline">
              Manage
            </Link>
          }
        >
          {d.complaints.length === 0 ? (
            <p className="text-sm text-slate-500">No complaints yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.complaints.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.typeLabel}</p>
                    <p className="truncate text-xs text-slate-500">{c.address}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
