import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/FormFields';
import { useSetting } from '../../hooks/useSettings';
import { saveSetting } from '../../services/adminService';
import { CATEGORIES, DEFAULT_IMPACT, DEFAULT_RATES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function AdminSettings() {
  const rates = useSetting('rates');
  const impact = useSetting('impact');
  const [rateRows, setRateRows] = useState(DEFAULT_RATES.items);
  const [factors, setFactors] = useState(DEFAULT_IMPACT);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!rates.loading) setRateRows(rates.value.items || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.loading]);

  useEffect(() => {
    if (!impact.loading)
      setFactors({
        kgPerItem: impact.value.kgPerItem,
        kgPerBag: impact.value.kgPerBag,
        co2PerKg: { ...DEFAULT_IMPACT.co2PerKg, ...impact.value.co2PerKg },
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact.loading]);

  const updateRow = (i, field, value) =>
    setRateRows(rateRows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const saveRates = async () => {
    const items = rateRows
      .filter((r) => r.material?.trim())
      .map((r) => ({ material: r.material.trim(), min: num(r.min), max: num(r.max), unit: r.unit || 'kg' }));
    if (items.some((r) => (r.min !== null && r.min < 0) || (r.max !== null && r.min !== null && r.max < r.min))) {
      setMessage({ type: 'error', text: 'Rates must be zero or greater, and max must be at least min.' });
      return;
    }
    setBusy('rates');
    try {
      await saveSetting('rates', { items });
      setMessage({ type: 'success', text: 'Value rates saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setBusy('');
    }
  };

  const saveImpact = async () => {
    const clean = {
      kgPerItem: Math.max(0, Number(factors.kgPerItem) || 0),
      kgPerBag: Math.max(0, Number(factors.kgPerBag) || 0),
      co2PerKg: Object.fromEntries(CATEGORIES.map((c) => [c.id, Math.max(0, Number(factors.co2PerKg[c.id]) || 0)])),
    };
    setBusy('impact');
    try {
      await saveSetting('impact', clean);
      setMessage({ type: 'success', text: 'Impact conversion factors saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err) });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fade-in space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure sample value rates and environmental impact conversion factors."
      />
      <Alert type={message.type || 'info'}>{message.text}</Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Estimated value rates (₹)">
          <p className="mb-3 text-xs text-slate-500">
            Sample rates shown to users with the note “Estimated value only. Actual recycler price may vary.” Leave
            min/max empty for “Variable”.
          </p>
          <div className="space-y-2">
            {rateRows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-4">
                  <Input
                    label={i === 0 ? 'Material' : undefined}
                    aria-label="Material"
                    value={r.material}
                    onChange={(e) => updateRow(i, 'material', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label={i === 0 ? 'Min' : undefined}
                    aria-label="Min"
                    type="number"
                    min="0"
                    value={r.min ?? ''}
                    onChange={(e) => updateRow(i, 'min', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label={i === 0 ? 'Max' : undefined}
                    aria-label="Max"
                    type="number"
                    min="0"
                    value={r.max ?? ''}
                    onChange={(e) => updateRow(i, 'max', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label={i === 0 ? 'Unit' : undefined}
                    aria-label="Unit"
                    value={r.unit ?? ''}
                    onChange={(e) => updateRow(i, 'unit', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    icon={Trash2}
                    onClick={() => setRateRows(rateRows.filter((_, idx) => idx !== i))}
                    aria-label="Remove row"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => setRateRows([...rateRows, { material: '', min: '', max: '', unit: 'kg' }])}
            >
              Add row
            </Button>
            <Button loading={busy === 'rates'} onClick={saveRates}>
              Save rates
            </Button>
          </div>
        </Card>

        <Card title="Environmental impact factors">
          <p className="mb-3 text-xs text-slate-500">
            Used to calculate the “Estimated impact” values. These are approximations, not scientific measurements.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Average kg per item"
              type="number"
              min="0"
              step="any"
              value={factors.kgPerItem}
              onChange={(e) => setFactors({ ...factors, kgPerItem: e.target.value })}
            />
            <Input
              label="Average kg per bag"
              type="number"
              min="0"
              step="any"
              value={factors.kgPerBag}
              onChange={(e) => setFactors({ ...factors, kgPerBag: e.target.value })}
            />
          </div>
          <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">kg CO₂e avoided per kg diverted</h3>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <Input
                key={c.id}
                label={c.label}
                type="number"
                min="0"
                step="any"
                value={factors.co2PerKg?.[c.id] ?? ''}
                onChange={(e) => setFactors({ ...factors, co2PerKg: { ...factors.co2PerKg, [c.id]: e.target.value } })}
              />
            ))}
          </div>
          <Button className="mt-4" loading={busy === 'impact'} onClick={saveImpact}>
            Save factors
          </Button>
        </Card>
      </div>
    </div>
  );
}
