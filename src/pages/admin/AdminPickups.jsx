import { useState } from 'react';
import { Truck, UserCheck, History, Sparkles } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import PickupCard from '../../components/PickupCard';
import { useAdminData } from '../../hooks/useAdminData';
import { assignCollector, updatePickupStatus } from '../../services/pickupService';
import { rankCollectors } from '../../utils/collectorSuggestion';
import { CATEGORIES, PICKUP_STATUSES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, formatStatus, shortId } from '../../utils/format';

export default function AdminPickups() {
  const d = useAdminData(['pickups', 'collectors']);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [chosen, setChosen] = useState('');
  const [historyFor, setHistoryFor] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const term = search.trim().toLowerCase();
  const rows = d.pickups.filter(
    (p) =>
      (!status || p.status === status) &&
      (!category || p.category === category) &&
      (!date || p.preferredDate === date) &&
      (!term ||
        `${p.id} ${p.itemName} ${p.userName} ${p.address} ${p.collectorName || ''}`.toLowerCase().includes(term)),
  );
  const ranking = assigning ? rankCollectors(assigning, d.collectors, d.pickups) : [];

  const openAssign = (p) => {
    const ranked = rankCollectors(p, d.collectors, d.pickups);
    setChosen(p.collectorId || ranked[0]?.collector.id || '');
    setAssigning(p);
  };

  const doAssign = async () => {
    if (!chosen) return;
    setBusy('assign');
    try {
      await assignCollector(assigning.id, chosen);
      setMessage({
        type: 'success',
        text: `Pickup ${shortId(assigning.id)} assigned. The user and collector have been notified.`,
      });
      setAssigning(null);
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not assign the collector.') });
    } finally {
      setBusy('');
    }
  };

  const changeStatus = async (p, newStatus) => {
    if (!newStatus || newStatus === p.status) return;
    if (!window.confirm(`Change pickup ${shortId(p.id)} to ${formatStatus(newStatus)}?`)) return;
    setBusy(p.id);
    try {
      const res = await updatePickupStatus(p.id, 'set_status', { status: newStatus });
      const pts = res?.pointsAwarded ? ` ${res.pointsAwarded} EcoPoints awarded to the user.` : '';
      setMessage({ type: 'success', text: `Status changed to ${formatStatus(newStatus)}.${pts}` });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not change the status.') });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Pickup Management"
        subtitle="Assign collectors, monitor progress and correct statuses if necessary."
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search ID, item, user, address..."
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
          <span className="whitespace-nowrap">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </FilterBar>

      {d.loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No pickup requests found."
          message="Pickup requests from users will appear here."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((p) => {
            const final = ['COMPLETED', 'CANCELLED'].includes(p.status);
            return (
              <PickupCard
                key={p.id}
                pickup={p}
                showUser
                actions={
                  <>
                    {['REQUESTED', 'ASSIGNED'].includes(p.status) && (
                      <Button size="sm" icon={UserCheck} onClick={() => openAssign(p)}>
                        {p.collectorId ? 'Reassign collector' : 'Assign collector'}
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" icon={History} onClick={() => setHistoryFor(p)}>
                      History
                    </Button>
                    {!final && (
                      <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                        Change status
                        <select
                          value={p.status}
                          disabled={busy === p.id}
                          onChange={(e) => changeStatus(p, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        >
                          {PICKUP_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {formatStatus(s)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={`Assign collector · ${shortId(assigning?.id)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button loading={busy === 'assign'} disabled={!chosen} onClick={doAssign}>
              Assign
            </Button>
          </>
        }
      >
        {assigning && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong>{assigning.itemName}</strong> · {assigning.address}
            </p>
            {ranking.length === 0 ? (
              <Alert type="warning">No active collectors yet. Create one in the Collectors section.</Alert>
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                  <Sparkles size={14} className="text-brand-600" aria-hidden="true" /> Suggested order (service area,
                  availability, current workload)
                </legend>
                {ranking.map((r, i) => (
                  <label
                    key={r.collector.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${chosen === r.collector.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
                  >
                    <input
                      type="radio"
                      name="collector"
                      value={r.collector.id}
                      checked={chosen === r.collector.id}
                      onChange={() => setChosen(r.collector.id)}
                      className="mt-1 accent-brand-600"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{r.collector.name}</span>
                      {i === 0 && (
                        <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">Suggested</span>
                      )}
                      <span className="block text-xs text-slate-500">
                        {r.areaMatch ? '✓ Serves this area' : '✗ Different area'} ·{' '}
                        {r.available ? '✓ Available' : '✗ Unavailable'} · {r.load} active pickup
                        {r.load === 1 ? '' : 's'}
                      </span>
                      <span className="block text-xs text-slate-400">
                        Areas: {r.collector.serviceAreas?.join(', ') || '-'}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(historyFor)}
        onClose={() => setHistoryFor(null)}
        title={`Pickup history · ${shortId(historyFor?.id)}`}
      >
        {historyFor && (
          <ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm">
            <li>
              <strong>Requested</strong> by {historyFor.userName}{' '}
              <span className="text-xs text-slate-400">({formatDate(historyFor.createdAt, true)})</span>
            </li>
            {(historyFor.history || []).map((h, i) => (
              <li key={i}>
                <strong>{formatStatus(h.status)}</strong>
                {h.note && ` — ${h.note}`}{' '}
                <span className="text-xs text-slate-400">
                  ({h.byName}, {h.byRole}, {formatDate(h.at, true)})
                </span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </div>
  );
}
