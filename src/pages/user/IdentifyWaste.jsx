import { useState } from 'react';
import { Hand, RotateCcw, History } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Input, Select } from '../../components/ui/FormFields';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import DisposalRecommendation from '../../components/DisposalRecommendation';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { useCategories } from '../../hooks/useCategories';
import { saveWasteRecord, subscribeUserWaste, updateWasteCategory } from '../../services/wasteService';
import { CATEGORIES, CATEGORY_MAP, UNITS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { sortByDateDesc, timeAgo } from '../../utils/format';

export default function IdentifyWaste() {
  const { profile } = useAuth();
  const { categories, map: categoryMap } = useCategories();
  const [phase, setPhase] = useState('manual');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [wasteId, setWasteId] = useState('');
  const [manual, setManual] = useState({ category: '', itemName: '', quantity: 1, unit: 'item' });
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);

  const { data: history } = useRealtime((ok, fail) => subscribeUserWaste(profile.uid, ok, fail), [profile.uid]);
  const recent = sortByDateDesc(history).slice(0, 5);

  const reset = () => {
    setPhase('manual');
    setError('');
    setResult(null);
    setWasteId('');
    setManual({ category: '', itemName: '', quantity: 1, unit: 'item' });
  };

  const saveManual = async (e) => {
    e.preventDefault();
    if (!manual.category) return setError('Please select a category.');
    if (manual.itemName.trim().length < 2) return setError('Please enter the item name.');
    if (!(Number(manual.quantity) > 0)) return setError('Quantity must be greater than zero.');
    setSaving(true);
    setError('');
    try {
      const cat = categoryMap[manual.category];
      const manualResult = {
        itemName: manual.itemName.trim(),
        category: manual.category,
        confidence: null,
        description: cat.description,
        recommendedAction: cat.action,
        recyclable: ['recyclable', 'ewaste'].includes(manual.category),
        estimatedValueRange: null,
      };
      const id = await saveWasteRecord(profile.uid, {
        ...manualResult,
        quantity: manual.quantity,
        unit: manual.unit,
        source: 'manual',
      });
      setWasteId(id);
      setResult(manualResult);
      setPhase('result');
    } catch (err) {
      setError(friendlyError(err, 'Could not save your waste record. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const correctCategory = async (category) => {
    if (!category || !wasteId) return;
    setCorrecting(true);
    try {
      await updateWasteCategory(wasteId, category);
      const cat = categoryMap[category];
      setResult({
        ...result,
        category,
        description: `Category corrected by you to ${cat.label}. ${cat.description}`,
        recommendedAction: cat.action,
        recyclable: ['recyclable', 'ewaste'].includes(category),
        estimatedValueRange: ['recyclable', 'ewaste'].includes(category) ? result.estimatedValueRange : null,
        corrected: true,
      });
    } catch (err) {
      setError(friendlyError(err, 'Could not update the category.'));
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Identify Your Waste"
        subtitle="Choose a category and enter the item details to get disposal guidance."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <Alert type="error" className="mt-4">
              {error}
            </Alert>
            {phase === 'result' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                  Identify another item
                </Button>
              </div>
            )}
          </Card>

          {phase === 'manual' && (
            <Card title="Select Category Manually">
              <Alert type="info" className="mb-4">Image upload and AI classification are disabled. Use the manual category selector below.</Alert>
              <form onSubmit={saveManual} className="space-y-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">Category *</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIES.map((c) => (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                          manual.category === c.id
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={c.id}
                          checked={manual.category === c.id}
                          onChange={() => setManual({ ...manual, category: c.id })}
                          className="accent-brand-600"
                        />
                        <span aria-hidden="true">{c.emoji}</span>
                        <span>
                          <span className="font-medium">{c.label}</span>
                          <span className="block text-xs text-slate-500">{c.examples.slice(0, 3).join(', ')}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Input
                  label="Item name"
                  value={manual.itemName}
                  onChange={(e) => setManual({ ...manual, itemName: e.target.value })}
                  placeholder="e.g. Plastic bottle"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Quantity"
                    type="number"
                    min="0.01"
                    step="any"
                    value={manual.quantity}
                    onChange={(e) => setManual({ ...manual, quantity: e.target.value })}
                    required
                  />
                  <Select
                    label="Unit"
                    value={manual.unit}
                    onChange={(e) => setManual({ ...manual, unit: e.target.value })}
                    options={UNITS}
                  />
                </div>
                <Button type="submit" loading={saving}>
                  Save & see recommendation
                </Button>
              </form>
            </Card>
          )}

          {phase === 'result' && result && (
            <Card className="fade-in">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Identified item</p>
                  <h2 className="text-2xl font-bold">{result.itemName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <CategoryBadge category={result.category} />
                    {result.confidence !== null && result.confidence !== undefined ? (
                      <span className="text-sm text-slate-600">
                        Confidence: <strong>{Math.round(result.confidence * 100)}%</strong>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">Selected manually</span>
                    )}
                  </div>
                </div>
                {wasteId && (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    Saved to history
                  </span>
                )}
              </div>

              {wasteId && (
                <div className="mb-5 max-w-xs">
                  <Select
                    label="Not correct? Change the category"
                    value={result.category}
                    onChange={(e) => correctCategory(e.target.value)}
                    options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                    disabled={correcting}
                  />
                </div>
              )}

              <DisposalRecommendation result={result} wasteId={wasteId} />
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Supported categories">
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <span aria-hidden="true">{c.emoji}</span>
                  <span>
                    <strong>{c.label}</strong> — <span className="text-slate-500">{c.examples.join(', ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title="Recent identifications"
            action={<History size={18} className="text-slate-400" aria-hidden="true" />}
          >
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No waste records yet. Your classifications will appear here.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 py-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100" aria-hidden="true">
                      {CATEGORY_MAP[w.category]?.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.itemName}</p>
                      <p className="text-xs text-slate-500">
                        {timeAgo(w.createdAt)} · {w.source === 'ai' ? 'AI' : 'Manual'}
                      </p>
                    </div>
                    <CategoryBadge category={w.category} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
