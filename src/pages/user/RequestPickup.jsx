import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Input, Select, Textarea } from '../../components/ui/FormFields';
import { useAuth } from '../../hooks/useAuth';
import { createPickup, newPickupId } from '../../services/pickupService';
import { CATEGORIES, CATEGORY_MAP, TIME_SLOTS, UNITS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { todayISO } from '../../utils/format';
import { validate, required, minLen, positiveNumber, notPastDate } from '../../utils/validation';

export default function RequestPickup() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const prefill = useLocation().state || {};
  // The document ID is created once per form, so double-clicking "Submit" can never create two requests.
  const [pickupId] = useState(() => newPickupId());
  const submittedRef = useRef(false);

  const [form, setForm] = useState({
    category: prefill.category || '',
    itemName: prefill.itemName || '',
    quantity: 1,
    unit: 'kg',
    address: profile.address || '',
    landmark: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
    wasteId: prefill.wasteId || null,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submittedRef.current) return;
    const v = validate(form, {
      category: [[required, 'Please select the waste category.']],
      itemName: [[minLen(2), 'Please enter the waste item.']],
      quantity: [[positiveNumber, 'Quantity must be greater than zero.']],
      unit: [[required, 'Please choose a unit.']],
      address: [[minLen(5), 'Please enter the pickup address.']],
      preferredDate: [
        [required, 'Please choose a preferred date.'],
        [notPastDate, 'Date cannot be in the past.'],
      ],
      preferredTime: [[required, 'Please choose a preferred time slot.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;

    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      await createPickup(pickupId, profile, form);
      navigate('/pickups', {
        state: { message: 'Pickup request submitted! You will be notified when a collector is assigned.' },
      });
    } catch (err) {
      submittedRef.current = false;
      setError(friendlyError(err, 'Pickup request could not be created.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Request Waste Pickup"
        subtitle="Schedule a doorstep collection. A collector will be assigned by the EcoSort team."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Alert type="error">{error}</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Waste category"
                value={form.category}
                onChange={set('category')}
                placeholder="Select category"
                options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                error={errors.category}
                required
              />
              <Input
                label="Waste item"
                value={form.itemName}
                onChange={set('itemName')}
                placeholder="e.g. Old newspapers"
                error={errors.itemName}
                required
              />
            </div>
            {form.category === 'hazardous' && (
              <Alert type="warning">
                Keep hazardous waste sealed and labelled. It will be routed to a specialised collection service.
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={set('quantity')}
                error={errors.quantity}
                required
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={set('unit')}
                options={UNITS}
                error={errors.unit}
                required
              />
            </div>
            <Textarea label="Address" value={form.address} onChange={set('address')} error={errors.address} required />
            <Input
              label="Landmark"
              value={form.landmark}
              onChange={set('landmark')}
              placeholder="e.g. Near City Mall"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Preferred date"
                type="date"
                min={todayISO()}
                value={form.preferredDate}
                onChange={set('preferredDate')}
                error={errors.preferredDate}
                required
              />
              <Select
                label="Preferred time"
                value={form.preferredTime}
                onChange={set('preferredTime')}
                placeholder="Select time slot"
                options={TIME_SLOTS}
                error={errors.preferredTime}
                required
              />
            </div>
            <Textarea
              label="Additional notes"
              value={form.notes}
              onChange={set('notes')}
              maxLength={500}
              placeholder="Anything the collector should know"
            />
            <Button type="submit" icon={Truck} loading={submitting}>
              Submit pickup request
            </Button>
          </form>
        </Card>
        <Card title="How pickup works" className="h-fit">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Submit your request (status: <strong>Requested</strong>).
            </li>
            <li>
              Admin assigns a nearby collector (<strong>Assigned</strong>).
            </li>
            <li>
              Collector accepts and heads to you (<strong>On The Way</strong>).
            </li>
            <li>
              Waste is picked up (<strong>Collected</strong>).
            </li>
            <li>
              Collection is verified (<strong>Completed</strong>) and you earn EcoPoints.
            </li>
          </ol>
          {form.category && (
            <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
              <strong>{CATEGORY_MAP[form.category].label}:</strong> {CATEGORY_MAP[form.category].action}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
