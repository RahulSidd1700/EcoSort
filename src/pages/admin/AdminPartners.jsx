import { useState } from 'react';
import { Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import { Input, Select, Textarea } from '../../components/ui/FormFields';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeAllPartners, savePartner, deletePartner } from '../../services/partnerService';
import { CATEGORIES, PARTNER_TYPES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { isEmail, minLen, required, validate } from '../../utils/validation';

const EMPTY = { name: '', type: '', categories: [], serviceArea: '', phone: '', email: '', address: '', active: true };

export default function AdminPartners() {
  const { data, loading, error } = useRealtime((ok, fail) => subscribeAllPartners(ok, fail), []);
  const [editing, setEditing] = useState(null); // null | 'new' | partner
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const open = (p) => {
    setEditing(p || 'new');
    setForm(p ? { ...EMPTY, ...p } : EMPTY);
    setErrors({});
  };

  const toggleCategory = (id) =>
    setForm({
      ...form,
      categories: form.categories.includes(id) ? form.categories.filter((c) => c !== id) : [...form.categories, id],
    });

  const save = async (e) => {
    e.preventDefault();
    const v = validate(form, {
      name: [[minLen(2), 'Partner name is required.']],
      type: [[required, 'Please choose the partner type.']],
      email: [[(val) => !val || isEmail(val), 'Please enter a valid email.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await savePartner(editing === 'new' ? null : editing.id, form);
      setMessage({ type: 'success', text: `Partner "${form.name}" saved.` });
      setEditing(null);
    } catch (err) {
      setErrors({ form: friendlyError(err, 'Could not save the partner.') });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete partner "${p.name}"?`)) return;
    try {
      await deletePartner(p.id);
      setMessage({ type: 'success', text: 'Partner deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Recycling Partners"
        subtitle="Manage the partner directory shown to users (only active partners are visible)."
        actions={
          <Button icon={Plus} onClick={() => open(null)}>
            Add partner
          </Button>
        }
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {error}
      </Alert>
      {loading ? (
        <ListSkeleton />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No partners yet"
          message="Add recyclers and collection partners."
          actionLabel="Add partner"
          onAction={() => open(null)}
        />
      ) : (
        <DataTable
          caption="Partners"
          rows={data}
          columns={[
            {
              key: 'name',
              label: 'Partner',
              render: (p) => (
                <>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.type}</p>
                </>
              ),
            },
            {
              key: 'categories',
              label: 'Categories',
              render: (p) => (
                <div className="flex flex-wrap gap-1">
                  {(p.categories || []).map((c) => (
                    <CategoryBadge key={c} category={c} />
                  ))}
                </div>
              ),
            },
            { key: 'serviceArea', label: 'Service area' },
            {
              key: 'contact',
              label: 'Contact',
              render: (p) => (
                <>
                  <p>{p.phone}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </>
              ),
            },
            {
              key: 'active',
              label: 'Status',
              render: (p) => <StatusBadge status={p.active ? 'ACTIVE' : 'INACTIVE'} />,
            },
            {
              key: 'actions',
              label: '',
              render: (p) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Pencil}
                    onClick={() => open(p)}
                    aria-label={`Edit ${p.name}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    icon={Trash2}
                    onClick={() => remove(p)}
                    aria-label={`Delete ${p.name}`}
                  />
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add partner' : 'Edit partner'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="partner-form" loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <form id="partner-form" onSubmit={save} className="space-y-3" noValidate>
          <Alert type="error">{errors.form}</Alert>
          <Input
            label="Partner name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            required
          />
          <Select
            label="Partner type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder="Select type"
            options={PARTNER_TYPES.map((t) => ({ value: t, label: t }))}
            error={errors.type}
            required
          />
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Categories handled</legend>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    className="accent-brand-600"
                  />{' '}
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Input
            label="Service area"
            value={form.serviceArea}
            onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
          </div>
          <Textarea
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="accent-brand-600"
            />{' '}
            Active (visible to users)
          </label>
        </form>
      </Modal>
    </div>
  );
}
