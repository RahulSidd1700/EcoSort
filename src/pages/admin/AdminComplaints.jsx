import { useState } from 'react';
import { TriangleAlert, Pencil } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Select, Textarea } from '../../components/ui/FormFields';
import { useAdminData } from '../../hooks/useAdminData';
import { useSetting } from '../../hooks/useSettings';
import { updateComplaintStatus } from '../../services/complaintService';
import { COMPLAINT_STATUSES, COMPLAINT_TYPES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, formatStatus } from '../../utils/format';

export default function AdminComplaints() {
  const d = useAdminData(['complaints']);
  const { value: rewards } = useSetting('rewards');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const rows = d.complaints.filter((c) => (!type || c.type === type) && (!status || c.status === status));

  const open = (c) => {
    setEditing(c);
    setForm({ status: c.status, note: c.adminNote || '' });
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await updateComplaintStatus(editing.id, form.status, form.note);
      const pts = res?.pointsAwarded ? ` Reporter earned ${res.pointsAwarded} EcoPoints.` : '';
      setMessage({ type: 'success', text: `Complaint updated to ${formatStatus(form.status)}.${pts}` });
      setEditing(null);
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not update the complaint.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Complaints"
        subtitle={`Review waste problem reports. Marking a report as Resolved verifies it and awards the reporter ${rewards.verifiedComplaint} EcoPoints (once).`}
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>
      <FilterBar
        filters={[
          { label: 'Types', value: type, onChange: setType, options: COMPLAINT_TYPES },
          {
            label: 'Statuses',
            value: status,
            onChange: setStatus,
            options: COMPLAINT_STATUSES.map((s) => ({ value: s, label: formatStatus(s) })),
          },
        ]}
      />
      {d.loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="No complaints found."
          message="Reports submitted by users will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => (
            <article key={c.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt={`Photo for ${c.typeLabel}`}
                  className="h-24 w-24 shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.typeLabel}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-slate-600">{c.description}</p>
                <p className="text-xs text-slate-500">📍 {c.address}</p>
                <p className="text-xs text-slate-400">
                  By {c.userName} · {formatDate(c.createdAt, true)}
                </p>
                {c.adminNote && <p className="rounded-lg bg-slate-50 p-2 text-xs">Note: {c.adminNote}</p>}
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => open(c)}>
                  Update status
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Update: ${editing?.typeLabel}`}
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
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={COMPLAINT_STATUSES.map((s) => ({ value: s, label: formatStatus(s) }))}
          />
          <Textarea
            label="Note to reporter (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            maxLength={500}
          />
        </div>
      </Modal>
    </div>
  );
}
