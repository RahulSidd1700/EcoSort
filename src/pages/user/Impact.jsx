import { Leaf, Recycle, Smartphone, CircleCheck, Factory, Info } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { StatCard } from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import CategoryChart from '../../components/charts/CategoryChart';
import { useAuth } from '../../hooks/useAuth';
import { useUserActivity } from '../../hooks/useUserActivity';
import { useSetting } from '../../hooks/useSettings';
import { computeImpact } from '../../utils/impact';
import { CATEGORIES } from '../../utils/constants';

export default function Impact() {
  const { profile } = useAuth();
  const activity = useUserActivity(profile.uid);
  const { value: factors } = useSetting('impact');
  const s = computeImpact(activity, factors);

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Environmental Impact" subtitle="Estimated impact of your responsible waste disposal." />
      <Alert type="info">
        <strong>Estimated impact.</strong> These numbers are approximations calculated from your completed pickups and
        sales using simple conversion factors. They are not scientifically exact measurements.
      </Alert>
      <Alert type="error">{activity.error}</Alert>

      {activity.loading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Leaf}
            label="Waste diverted from general disposal"
            value={`${s.divertedKg} kg`}
            hint="Estimated"
          />
          <StatCard
            icon={Recycle}
            label="Recyclable material submitted"
            value={`${s.recyclableKg} kg`}
            hint="Estimated"
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            icon={Smartphone}
            label="E-waste submitted"
            value={`${s.ewasteKg} kg`}
            hint="Estimated"
            color="bg-purple-50 text-purple-700"
          />
          <StatCard
            icon={CircleCheck}
            label="Responsible disposal actions"
            value={s.responsibleActions}
            hint="Completed pickups + sales"
            color="bg-green-50 text-green-700"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Diverted waste by category (kg, estimated)">
          <CategoryChart counts={s.byCategory} unit="kg" />
        </Card>
        <Card title="Estimated CO₂ emissions avoided">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-brand-50 p-4 text-brand-700">
              <Factory size={32} aria-hidden="true" />
            </div>
            <div>
              <p className="text-3xl font-bold">{s.co2SavedKg} kg CO₂e</p>
              <p className="text-sm text-slate-500">Rough estimate compared with sending the same waste to landfill.</p>
            </div>
          </div>
          <h3 className="mt-6 mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700">
            <Info size={14} aria-hidden="true" /> Conversion factors used
          </h3>
          <ul className="grid grid-cols-2 gap-1 text-xs text-slate-600">
            <li>1 item ≈ {factors.kgPerItem} kg</li>
            <li>1 bag ≈ {factors.kgPerBag} kg</li>
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                {c.label}: {factors.co2PerKg?.[c.id] ?? 0} kg CO₂e/kg
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Factors are configurable by the administrator.</p>
        </Card>
      </div>
    </div>
  );
}
