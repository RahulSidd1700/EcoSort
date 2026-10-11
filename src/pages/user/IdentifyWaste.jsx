import { useState } from 'react';
import { Sparkles, RotateCcw, History } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Input, Select } from '../../components/ui/FormFields';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import ImageUpload from '../../components/ImageUpload';
import DisposalRecommendation from '../../components/DisposalRecommendation';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { useCategories } from '../../hooks/useCategories';
import { classifyImage, saveWasteRecord, subscribeUserWaste, updateWasteCategory } from '../../services/wasteService';
import { CATEGORIES, CATEGORY_MAP, LOW_CONFIDENCE, UNITS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { sortByDateDesc, timeAgo } from '../../utils/format';

// phase: idle -> analyzing -> result (or -> manual when AI fails as fallback)
export default function IdentifyWaste() {
  const { profile } = useAuth();
  const { categories, map: categoryMap } = useCategories();
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [aiFailed, setAiFailed] = useState(false);
  const [result, setResult] = useState(null);
  const [wasteId, setWasteId] = useState('');
  const [manual, setManual] = useState({ category: '', itemName: '', quantity: 1, unit: 'item' });
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);

  const { data: history } = useRealtime((ok, fail) => subscribeUserWaste(profile.uid, ok, fail), [profile.uid]);
  const recent = sortByDateDesc(history).slice(0, 5);

  const reset = () => {
    setFile(null);
    setPhase('idle');
    setError('');
    setAiFailed(false);
    setResult(null);
    setWasteId('');
    setManual({ category: '', itemName: '', quantity: 1, unit: 'item' });
  };

  const analyze = async () => {
    if (!file) {
      setError('Please upload or take a photo first.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Please choose an image smaller than 8 MB.');
      return;
    }

    setError('');
    setAiFailed(false);
    setPhase('analyzing');

    try {
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.readAsDataURL(file);
      });

      const data = await classifyImage(imageDataUrl, file.type);
      const categoryIds = {
        Recyclable: 'recyclable',
        Organic: 'organic',
        'E-Waste': 'ewaste',
        Hazardous: 'hazardous',
        'Non-Recyclable': 'non_recyclable',
      };
      const category = categoryIds[data.category];
      if (!category) throw new Error('The AI returned a category that EcoSort does not support.');

      const cat = categoryMap[category] || CATEGORY_MAP[category];
      const aiResult = {
        itemName: data.item || 'Waste item',
        category,
        confidence: null,
        description: data.description || cat?.description || '',
        recommendedAction: data.disposal_advice || cat?.action || '',
        recyclable: ['recyclable', 'ewaste'].includes(category),
        estimatedValueRange: null,
        source: 'ai',
      };

      try {
        const id = await saveWasteRecord(profile.uid, {
          ...aiResult,
          quantity: 1,
          unit: 'item',
          source: 'ai',
        });
        setWasteId(id);
      } catch (err) {
        console.warn('Record could not be saved to history:', err);
      }

      setResult(aiResult);
      setPhase('result');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not classify the image. Make sure the AI server is running.');
      setAiFailed(true);
      setPhase('manual');
    }
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
        description: cat?.description || '',
        recommendedAction: cat?.action || '',
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
        description: `Category corrected by you to ${cat?.label}. ${cat?.description || ''}`,
        recommendedAction: cat?.action || '',
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

  const busy = phase === 'analyzing';
  const lowConfidence = result && result.confidence !== null && result.confidence < LOW_CONFIDENCE && !result.corrected;

  return (
    <div className="fade-in">
      <PageHeader
        title="Identify Your Waste"
        subtitle="Upload a photo and EcoSort AI will tell you how to dispose of it."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <ImageUpload
              label="Waste image"
              file={file}
              onChange={(f) => {
                setFile(f);
                if (phase === 'result' || phase === 'manual') reset();
                if (f) setError('');
              }}
              disabled={busy || phase === 'result'}
            />
            <Alert type="error" className="mt-4">
              {error}
            </Alert>

            {busy && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-brand-800">
                <LoadingSpinner />
                <div>
                  <p className="font-medium">Analysing your waste with AI...</p>
                  <p className="text-xs text-brand-700">This usually takes 2-4 seconds.</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {phase !== 'result' && phase !== 'manual' && (
                <Button icon={Sparkles} onClick={analyze} loading={busy} disabled={!file}>
                  Analyze Waste
                </Button>
              )}
              {(phase === 'result' || phase === 'manual') && (
                <Button variant="secondary" icon={RotateCcw} onClick={reset}>
                  Identify another item
                </Button>
              )}
            </div>
          </Card>

          {phase === 'manual' && (
            <Card title="Select Category Manually">
              {aiFailed && (
                <Alert type="warning" className="mb-4">
                  AI classification is currently unavailable. Please select the category manually to continue.
                </Alert>
              )}
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

              {lowConfidence && (
                <Alert type="warning" className="mb-4">
                  <strong>AI confidence is low. Please verify the category before disposal.</strong>
                </Alert>
              )}

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
                    {w.imageUrl ? (
                      <img src={w.imageUrl} alt={w.itemName} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"
                        aria-hidden="true"
                      >
                        {CATEGORY_MAP[w.category]?.emoji}
                      </span>
                    )}
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
