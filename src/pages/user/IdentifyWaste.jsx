import { useState } from 'react';
import { Sparkles, Hand, RotateCcw, History } from 'lucide-react';
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
import { uploadImage } from '../../services/storageService';
import { classifyImage, saveWasteRecord, subscribeUserWaste, updateWasteCategory } from '../../services/wasteService';
import { CATEGORIES, CATEGORY_MAP, LOW_CONFIDENCE, UNITS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { sortByDateDesc, timeAgo } from '../../utils/format';

// phase: idle -> uploading -> analyzing -> result   (or -> manual when AI fails / user chooses)
export default function IdentifyWaste() {
  const { profile } = useAuth();
  const { categories, map: categoryMap } = useCategories();
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [aiFailed, setAiFailed] = useState(false);
  const [uploaded, setUploaded] = useState(null); // { url, path }
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
    setUploaded(null);
    setResult(null);
    setWasteId('');
    setManual({ category: '', itemName: '', quantity: 1, unit: 'item' });
  };

  const analyze = async () => {
    if (!file) {
      setError('Please upload or take a photo first.');
      return;
    }
    setError('');
    setAiFailed(false);

    let image = uploaded;
    if (!image) {
      setPhase('uploading');
      try {
        image = await uploadImage('waste-images', profile.uid, file);
        setUploaded(image);
      } catch (err) {
        setPhase('idle');
        setError(
          err.message?.startsWith('Unsupported') || err.message?.startsWith('Image is too large')
            ? err.message
            : friendlyError(err, 'Unable to upload image. Please try again.'),
        );
        return;
      }
    }

    setPhase('analyzing');
    let aiResult;
    try {
      aiResult = await classifyImage(image.path);
    } catch (err) {
      console.error(err);
      setAiFailed(true);
      setPhase('manual');
      return;
    }

    try {
      const id = await saveWasteRecord(profile.uid, {
        ...aiResult,
        imageUrl: image.url,
        imagePath: image.path,
        quantity: 1,
        unit: 'item',
        source: 'ai',
      });
      setWasteId(id);
    } catch (err) {
      setError(friendlyError(err, 'Result shown below, but it could not be saved to your history.'));
    }
    setResult(aiResult);
    setPhase('result');
  };

  const saveManual = async (e) => {
    e.preventDefault();
    if (!manual.category) return setError('Please select a category.');
    if (manual.itemName.trim().length < 2) return setError('Please enter the item name.');
    if (!(Number(manual.quantity) > 0)) return setError('Quantity must be greater than zero.');
    setSaving(true);
    setError('');
    try {
      let image = uploaded;
      if (file && !image) {
        image = await uploadImage('waste-images', profile.uid, file);
        setUploaded(image);
      }
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
        imageUrl: image?.url,
        imagePath: image?.path,
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

  const busy = phase === 'uploading' || phase === 'analyzing';
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
                setUploaded(null);
                if (phase === 'result') reset();
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
                  <p className="font-medium">
                    {phase === 'uploading' ? 'Uploading image...' : 'Analysing your waste with AI...'}
                  </p>
                  <p className="text-xs">This usually takes a few seconds.</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {phase !== 'result' && phase !== 'manual' && (
                <>
                  <Button icon={Sparkles} onClick={analyze} loading={busy} disabled={!file}>
                    Analyze Waste
                  </Button>
                  <Button variant="ghost" icon={Hand} onClick={() => setPhase('manual')} disabled={busy}>
                    Select Category Manually
                  </Button>
                </>
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
                  AI classification is currently unavailable. You can still choose the category yourself and continue.
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

              {wasteId && result.confidence !== null && (
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

              <DisposalRecommendation result={result} wasteId={wasteId} imageUrl={uploaded?.url} />
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
