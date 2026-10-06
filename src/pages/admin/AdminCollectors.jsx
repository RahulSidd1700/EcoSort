import { useState } from 'react';
import { Plus, Pencil, UserCog } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Input } from '../../components/ui/FormFields';
import { useAdminData } from '../../hooks/useAdminData';
import { createCollector, updateCollector } from '../../services/adminService';
import { friendlyError } from '../../utils/errors';
import { isEmail, isPhone, minLen, validate } from '../../utils/validation';

const EMPTY = { name: '', email: '', phone: '', password: '', serviceAreas: '' };

export default function AdminCollectors() {
  const d = useAdminData(['collectors', 'pickups']);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [areas, setAreas] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const stats = (id) => {
    const mine = d.pickups.filter((p) => p.collectorId === id);
    return {
      active: mine.filter((p) => ['ASSIGNED', 'ON_THE_WAY', 'COLLECTED'].includes(p.status)).length,
      completed: mine.filter((p) => p.status === 'COMPLETED').length,
    };
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const v = validate(form, {
      name: [[minLen(2), 'Name is required.']],
      email: [[isEmail, 'Valid email is required.']],
      phone: [[isPhone, 'Valid phone is required.']],
      password: [[minLen(6), 'Temporary password must be at least 6 characters.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy('create');
    try {
      await createCollector(form);
      setMessage({
        type: 'success',
        text: `Collector account created for ${form.email}. Share the temporary password privately and ask them to change it.`,
      });
      setCreateOpen(false);
      setForm(EMPTY);
    } catch (err) {
      setErrors({ form: friendlyError(err, 'Could not create the collector account.') });
    } finally {
      setBusy('');
    }
  };

  const saveAreas = async () => {
    setBusy('areas');
    try {
      await updateCollector(editing.id, {
        serviceAreas: areas
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      });
      setMessage({ type: 'success', text: 'Service areas updated.' });
      setEditing(null);
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setBusy('');
    }
  };

  const toggleAvailable = async (c) => {
    try {
      await updateCollector(c.id, { available: !c.available });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Collectors / Recyclers"
        subtitle="Create collector accounts and manage service areas and availability."
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Add collector
          </Button>
        }
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>
      {d.loading ? (
        <ListSkeleton />
      ) : d.collectors.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No collectors yet"
          message="Create a collector account so pickups can be assigned."
          actionLabel="Add collector"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <DataTable
          caption="Collectors"
          rows={d.collectors}
          columns={[
            {
              key: 'name',
              label: 'Collector',
              render: (c) => (
                <>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.email} · {c.phone}
                  </p>
                </>
              ),
            },
            { key: 'areas', label: 'Service areas', render: (c) => c.serviceAreas?.join(', ') || '-' },
            {
              key: 'load',
              label: 'Active / completed',
              render: (c) => {
                const s = stats(c.id);
                return `${s.active} / ${s.completed}`;
              },
            },
            {
              key: 'available',
              label: 'Availability',
              render: (c) => (
                <button
                  onClick={() => toggleAvailable(c)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.available ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}
                >
                  {c.available ? 'Available' : 'Unavailable'}
                </button>
              ),
            },
            {
              key: 'active',
              label: 'Account',
              render: (c) => <StatusBadge status={c.active === false ? 'INACTIVE' : 'ACTIVE'} />,
            },
            {
              key: 'actions',
              label: '',
              render: (c) => (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => {
                    setEditing(c);
                    setAreas((c.serviceAreas || []).join(', '));
                  }}
                >
                  Areas
                </Button>
              ),
            },
          ]}
        />
      )}
      <p className="mt-3 text-xs text-slate-500">To deactivate a collector account, use the Users page.</p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add collector / recycler"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="collector-form" loading={busy === 'create'}>
              Create account
            </Button>
          </>
        }
      >
        <form id="collector-form" onSubmit={submitCreate} className="space-y-3" noValidate>
          <Alert type="error">{errors.form}</Alert>
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            required
          />
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            hint="Share privately. It is not stored in Firestore."
            required
          />
          <Input
            label="Service areas"
            value={form.serviceAreas}
            onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })}
            hint="Comma separated, e.g. Koramangala, HSR Layout"
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Service areas · ${editing?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={busy === 'areas'} onClick={saveAreas}>
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Service areas"
          value={areas}
          onChange={(e) => setAreas(e.target.value)}
          hint="Comma separated. Used for the smart assignment suggestion."
        />
      </Modal>
    </div>
  );
}
