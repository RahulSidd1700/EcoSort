import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/FormFields';
import { useAdminData } from '../../hooks/useAdminData';
import { useSetting } from '../../hooks/useSettings';
import { saveSetting } from '../../services/adminService';
import { DEFAULT_REWARDS, REWARD_LABELS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate } from '../../utils/format';

export default function AdminRewards() {
  const d = useAdminData(['rewards', 'users']);
  const { value, loading: settingsLoading } = useSetting('rewards');
  const [form, setForm] = useState(DEFAULT_REWARDS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!settingsLoading) setForm(Object.fromEntries(Object.keys(DEFAULT_REWARDS).map((k) => [k, value[k]])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading]);

  const save = async (e) => {
    e.preventDefault();
    const clean = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))]),
    );
    setBusy(true);
    try {
      await saveSetting('rewards', clean);
      setMessage({ type: 'success', text: 'Reward settings saved. New values apply to future events.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  };

  const userName = (id) => d.users.find((u) => u.id === id)?.name || id;
  const total = d.rewards.reduce((s, r) => s + (r.points || 0), 0);

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Rewards" subtitle="Configure EcoPoints and review all reward transactions." />
      <Alert type={message.type || 'info'}>{message.text}</Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="EcoPoints settings">
          <form onSubmit={save} className="space-y-3">
            {Object.keys(DEFAULT_REWARDS).map((k) => (
              <Input
                key={k}
                label={REWARD_LABELS[k]}
                type="number"
                min="0"
                value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            ))}
            <Button type="submit" loading={busy}>
              Save settings
            </Button>
            <p className="text-xs text-slate-500">
              Points are awarded by Cloud Functions. Each event (pickup, sale, complaint) can award points only once.
            </p>
          </form>
        </Card>
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Reward transactions ({d.rewards.length})</h2>
            <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-800">
              Total: {total} pts
            </span>
          </div>
          <Alert type="error">{d.error}</Alert>
          {d.loading ? (
            <ListSkeleton />
          ) : d.rewards.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No reward transactions yet"
              message="Points appear here when pickups or sales are completed."
            />
          ) : (
            <DataTable
              caption="Reward transactions"
              rows={d.rewards}
              columns={[
                { key: 'user', label: 'User', render: (r) => userName(r.userId) },
                { key: 'label', label: 'Reason', render: (r) => r.label || r.action },
                {
                  key: 'points',
                  label: 'Points',
                  render: (r) => <span className="font-bold text-green-700">+{r.points}</span>,
                },
                {
                  key: 'id',
                  label: 'Reference',
                  render: (r) => <code className="text-xs text-slate-500">{r.id}</code>,
                },
                { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt, true) },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
