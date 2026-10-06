import { useState } from 'react';
import { Check, Truck, Package, CircleCheck } from 'lucide-react';
import Button from './ui/Button';
import { updatePickupStatus } from '../services/pickupService';
import { friendlyError } from '../utils/errors';

/**
 * Status buttons for the assigned collector. Only the next valid step is enabled;
 * the Cloud Function validates the transition again on the server.
 */
export default function CollectorActions({ pickup, onMessage }) {
  const [busy, setBusy] = useState('');

  const steps = [
    {
      action: 'accept',
      label: 'Accept',
      icon: Check,
      enabled: pickup.status === 'ASSIGNED' && !pickup.acceptedByCollector,
    },
    {
      action: 'on_the_way',
      label: 'Mark On The Way',
      icon: Truck,
      enabled: pickup.status === 'ASSIGNED' && pickup.acceptedByCollector,
    },
    { action: 'collected', label: 'Mark Collected', icon: Package, enabled: pickup.status === 'ON_THE_WAY' },
    { action: 'complete', label: 'Mark Completed', icon: CircleCheck, enabled: pickup.status === 'COLLECTED' },
  ];

  const run = async (action, label) => {
    setBusy(action);
    try {
      const res = await updatePickupStatus(pickup.id, action);
      const pts = res?.pointsAwarded ? ` The user earned ${res.pointsAwarded} EcoPoints.` : '';
      onMessage?.({ type: 'success', text: `${label}: ${pickup.itemName}.${pts}` });
    } catch (err) {
      onMessage?.({ type: 'error', text: friendlyError(err, 'Status could not be updated.') });
    } finally {
      setBusy('');
    }
  };

  if (['COMPLETED', 'CANCELLED'].includes(pickup.status)) return null;

  return steps.map((s) => (
    <Button
      key={s.action}
      size="sm"
      variant={s.enabled ? 'primary' : 'secondary'}
      icon={s.icon}
      disabled={!s.enabled || Boolean(busy)}
      loading={busy === s.action}
      onClick={() => run(s.action, s.label)}
    >
      {s.label}
    </Button>
  ));
}
