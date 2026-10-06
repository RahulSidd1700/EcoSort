import { useState } from 'react';
import { Pencil } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import { Input, Textarea } from '../../components/ui/FormFields';
import { useCategories } from '../../hooks/useCategories';
import { saveCategory } from '../../services/adminService';
import { friendlyError } from '../../utils/errors';

/** The 5 categories are fixed (AI may only use these). Admin can edit their descriptions and guidance. */
export default function AdminCategories() {
  const { categories, loading } = useCategories();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ description: '', action: '', examples: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const open = (c) => {
    setEditing(c);
    setForm({ description: c.description, action: c.action, examples: c.examples.join(', ') });
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveCategory(editing.id, {
        label: editing.label,
        description: form.description.trim(),
        action: form.action.trim(),
        examples: form.examples
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      });
      setMessage({ type: 'success', text: `${editing.label} updated.` });
      setEditing(null);
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Waste Categories"
        subtitle="EcoSort uses exactly five categories. You can edit their descriptions, examples and recommended actions."
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      {loading ? (
        <CardGridSkeleton count={5} className="h-48" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border-t-4 bg-white p-5 shadow-sm"
              style={{ borderTopColor: c.color }}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </h3>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => open(c)}
                  aria-label={`Edit ${c.label}`}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                <strong>Examples:</strong> {c.examples.join(', ')}
              </p>
              <p className="mt-2 rounded-lg bg-brand-50 p-2 text-xs text-brand-900">
                <strong>Action:</strong> {c.action}
              </p>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.label}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Examples (comma separated)"
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
          />
          <Textarea
            label="Recommended action"
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
