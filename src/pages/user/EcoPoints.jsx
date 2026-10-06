import { Award } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import EcoLevelCard from '../../components/EcoLevelCard';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { useSetting } from '../../hooks/useSettings';
import { subscribeUserRewards } from '../../services/rewardService';
import { ECO_LEVELS, REWARD_LABELS } from '../../utils/constants';
import { formatDate, sortByDateDesc } from '../../utils/format';

export default function EcoPoints() {
  const { profile } = useAuth();
  const { data, loading, error } = useRealtime(
    (ok, fail) => subscribeUserRewards(profile.uid, ok, fail),
    [profile.uid],
  );
  const { value: rewards } = useSetting('rewards');
  const history = sortByDateDesc(data);
  const points = profile.ecoPoints || 0;

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="EcoPoints" subtitle="Earn points for every responsible disposal action." />
      <div className="grid gap-6 lg:grid-cols-3">
        <EcoLevelCard points={points} />
        <Card title="How to earn points" className="lg:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(REWARD_LABELS).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{label}</span>
                <span className="font-bold text-brand-700">+{rewards[key]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Points are awarded automatically by the server, only once per eligible event.
          </p>
        </Card>
      </div>

      <Card title="Eco levels">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ECO_LEVELS.map((l) => {
            const current = points >= l.min && points <= l.max;
            return (
              <li
                key={l.name}
                className={`rounded-xl border p-4 ${current ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
              >
                <p className="text-2xl" aria-hidden="true">
                  {l.emoji}
                </p>
                <p className="font-semibold">
                  {l.name}
                  {current && <span className="ml-1 text-xs text-brand-700">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {l.max === Infinity ? `${l.min}+ points` : `${l.min}–${l.max} points`}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Points history">
        <Alert type="error" className="mb-3">
          {error}
        </Alert>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No points yet"
            message="Complete a pickup or a sale to earn your first EcoPoints."
            actionLabel="Request Pickup"
            actionTo="/pickups/new"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{r.label || r.action}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.createdAt, true)}</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-700">+{r.points}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
