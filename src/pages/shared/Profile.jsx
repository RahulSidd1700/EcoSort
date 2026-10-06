import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Input, Textarea } from '../../components/ui/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { updateProfileInfo, resetPassword } from '../../services/authService';
import { subscribeCollectorProfile, updateCollector } from '../../services/adminService';
import { friendlyError } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { getEcoLevel } from '../../utils/impact';
import { isPhone, minLen, validate } from '../../utils/validation';

export default function Profile() {
  const { profile, role } = useAuth();
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    address: profile.address || '',
    area: profile.area || '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const { data: collector } = useRealtime(
    (ok, fail) => subscribeCollectorProfile(profile.uid, ok, fail),
    [profile.uid],
    role === 'collector',
    null,
  );

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate(form, {
      name: [[minLen(2), 'Please enter your name.']],
      phone: [[isPhone, 'Please enter a valid phone number.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      await updateProfileInfo(profile.uid, form);
      setStatus({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setStatus({ type: 'error', text: friendlyError(err, 'Could not update your profile.') });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    try {
      await resetPassword(profile.email);
      setStatus({ type: 'success', text: `Password reset link sent to ${profile.email}.` });
    } catch (err) {
      setStatus({ type: 'error', text: friendlyError(err) });
    }
  };

  const toggleAvailability = async () => {
    try {
      await updateCollector(profile.uid, { available: !collector?.available });
    } catch (err) {
      setStatus({ type: 'error', text: friendlyError(err) });
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="My Profile" subtitle="Manage your account details." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Alert type={status.type || 'info'}>{status.text}</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full Name" value={form.name} onChange={set('name')} error={errors.name} required />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                error={errors.phone}
                required
              />
            </div>
            <Input label="Email" value={profile.email} disabled hint="Email cannot be changed." />
            <Textarea label="Address" value={form.address} onChange={set('address')} />
            <Input label="Area / Locality" value={form.area} onChange={set('area')} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
              <Button variant="secondary" onClick={sendReset}>
                Send password reset email
              </Button>
            </div>
          </form>
        </Card>
        <div className="space-y-6">
          <Card title="Account">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium capitalize">{role}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              {role === 'user' && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">EcoPoints</dt>
                    <dd className="font-medium">{profile.ecoPoints || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Eco level</dt>
                    <dd className="font-medium">{getEcoLevel(profile.ecoPoints).name}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>
          {role === 'collector' && collector && (
            <Card title="Collector settings">
              <p className="text-sm text-slate-500">Service areas</p>
              <p className="mb-3 font-medium">{collector.serviceAreas?.join(', ') || 'Not set (ask admin)'}</p>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm">Available for new pickups</span>
                <button
                  role="switch"
                  aria-checked={Boolean(collector.available)}
                  onClick={toggleAvailability}
                  className={`relative h-6 w-11 rounded-full transition-colors ${collector.available ? 'bg-brand-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${collector.available ? 'left-5.5' : 'left-0.5'}`}
                  />
                  <span className="sr-only">Toggle availability</span>
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
