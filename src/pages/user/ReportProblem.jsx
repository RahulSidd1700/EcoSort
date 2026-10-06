import { useRef, useState } from 'react';
import { TriangleAlert, Send } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Select, Textarea } from '../../components/ui/FormFields';
import ImageUpload from '../../components/ImageUpload';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { createComplaint, subscribeMyComplaints } from '../../services/complaintService';
import { uploadImage } from '../../services/storageService';
import { COMPLAINT_TYPES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, sortByDateDesc } from '../../utils/format';
import { validate, required, minLen } from '../../utils/validation';

const EMPTY = { type: '', description: '', address: '' };

export default function ReportProblem() {
  const { profile } = useAuth();
  const {
    data,
    loading,
    error: loadError,
  } = useRealtime((ok, fail) => subscribeMyComplaints(profile.uid, ok, fail), [profile.uid]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const complaints = sortByDateDesc(data);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const v = validate(form, {
      type: [[required, 'Please choose the problem type.']],
      description: [[minLen(10), 'Please describe the problem (at least 10 characters).']],
      address: [[minLen(5), 'Please enter the location / address.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    submittingRef.current = true;
    setSubmitting(true);
    setStatus({ type: '', text: '' });
    try {
      let image = { url: '', path: '' };
      if (file) image = await uploadImage('complaint-images', profile.uid, file);
      await createComplaint(profile, { ...form, imageUrl: image.url, imagePath: image.path });
      setForm(EMPTY);
      setFile(null);
      setStatus({
        type: 'success',
        text: 'Thank you! Your report has been submitted. Verified reports earn EcoPoints.',
      });
    } catch (err) {
      setStatus({ type: 'error', text: friendlyError(err, 'Your report could not be submitted. Please try again.') });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Report a Waste Problem"
        subtitle="Help keep your area clean by reporting waste problems to the EcoSort team."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Alert type={status.type || 'info'}>{status.text}</Alert>
            <Select
              label="Problem type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="Select problem type"
              options={COMPLAINT_TYPES}
              error={errors.type}
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={errors.description}
              maxLength={1000}
              placeholder="What is the problem and since when?"
              required
            />
            <Textarea
              label="Location / address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              error={errors.address}
              placeholder="Street, landmark, area"
              required
            />
            <ImageUpload label="Photo (optional)" file={file} onChange={setFile} />
            <Button type="submit" icon={Send} loading={submitting}>
              Submit report
            </Button>
          </form>
        </Card>
        <Card title="My reports">
          <Alert type="error" className="mb-3">
            {loadError}
          </Alert>
          {loading ? (
            <ListSkeleton rows={3} />
          ) : complaints.length === 0 ? (
            <EmptyState
              icon={TriangleAlert}
              title="No reports yet"
              message="Problems you report will appear here with their status."
            />
          ) : (
            <ul className="space-y-3">
              {complaints.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{c.typeLabel}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.address} · {formatDate(c.createdAt)}
                  </p>
                  {c.adminNote && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Admin note: {c.adminNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
