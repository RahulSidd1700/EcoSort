import { Check, X, Truck, Tag, BookOpen, TriangleAlert } from 'lucide-react';
import Button from './ui/Button';
import { CategoryBadge } from './ui/StatusBadge';
import { CATEGORY_MAP, SELLABLE_CATEGORIES } from '../utils/constants';
import { formatRange } from '../utils/format';

function YesNo({ value, yes, no }) {
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${value ? 'text-green-700' : 'text-slate-500'}`}>
      {value ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
      {value ? yes : no}
    </span>
  );
}

/**
 * "What should you do with this?" panel shown after classification.
 * result: { itemName, category, description, recommendedAction, estimatedValueRange }
 */
export default function DisposalRecommendation({ result, wasteId, imageUrl }) {
  const category = CATEGORY_MAP[result.category];
  const canSell = SELLABLE_CATEGORIES.includes(result.category);
  const prefill = {
    wasteId,
    category: result.category,
    itemName: result.itemName,
    imageUrl: imageUrl || '',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">What should you do with this?</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Item</dt>
          <dd className="font-semibold text-slate-800">{result.itemName}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Category</dt>
          <dd className="mt-0.5">
            <CategoryBadge category={result.category} />
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
          <dt className="text-slate-500">Why it belongs to this category</dt>
          <dd className="text-slate-800">{result.description || category?.description}</dd>
        </div>
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
          <dt className="font-medium text-brand-800">Recommended disposal method</dt>
          <dd className="text-slate-800">{result.recommendedAction || category?.action}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Can it be sold?</dt>
          <dd>
            <YesNo value={canSell} yes="Yes - create a listing" no="No" />
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Is pickup available?</dt>
          <dd>
            <YesNo value yes={result.category === 'hazardous' ? 'Yes - specialised collection' : 'Yes'} no="No" />
          </dd>
        </div>
        {canSell && (
          <div className="rounded-xl bg-amber-50 p-3 sm:col-span-2">
            <dt className="text-amber-800">Estimated value</dt>
            <dd className="text-lg font-semibold text-slate-800">
              {result.estimatedValueRange
                ? formatRange(result.estimatedValueRange.min, result.estimatedValueRange.max)
                : 'Variable'}
            </dd>
            <p className="text-xs text-amber-800">Estimated value only. Actual recycler price may vary.</p>
          </div>
        )}
      </dl>

      {result.category === 'hazardous' && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <TriangleAlert size={18} className="shrink-0" aria-hidden="true" />
          Hazardous waste must be handled by a specialised collection service. Never burn it, pour it into drains or mix
          it with household waste.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button icon={Truck} to="/pickups/new" state={prefill}>
          Request Pickup
        </Button>
        {canSell && (
          <Button icon={Tag} variant="outline" to="/sell/new" state={prefill}>
            Sell This Waste
          </Button>
        )}
        <Button icon={BookOpen} variant="secondary" to={`/guide?category=${result.category}`}>
          View Disposal Guide
        </Button>
      </div>
    </div>
  );
}
