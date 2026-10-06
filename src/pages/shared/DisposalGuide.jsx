import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, ShieldCheck, BookOpen } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import { GUIDE_ITEMS } from '../../utils/guideData';
import { CATEGORIES } from '../../utils/constants';
import { useCategories } from '../../hooks/useCategories';

function Flag({ ok, label }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? 'text-green-700' : 'text-slate-400'}`}>
      {ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
      <span>
        {label}: {ok ? 'Yes' : 'No'}
      </span>
    </li>
  );
}

/** "How Should I Dispose This?" - static, searchable guide that works without AI. */
export default function DisposalGuide() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const { map: categoryMap } = useCategories();
  const category = CATEGORIES.some((c) => c.id === params.get('category')) ? params.get('category') : '';
  const selected = category ? categoryMap[category] : null;
  const term = search.trim().toLowerCase();

  const items = GUIDE_ITEMS.filter(
    (i) => (!category || i.category === category) && (!term || `${i.name} ${i.keywords}`.toLowerCase().includes(term)),
  );

  return (
    <div className="fade-in">
      <PageHeader
        title="How Should I Dispose This?"
        subtitle="Search common household items to find the right disposal method."
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search e.g. battery, laptop, cardboard..."
        filters={[
          {
            label: 'Categories',
            value: category,
            onChange: (v) => setParams(v ? { category: v } : {}),
            options: CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
          },
        ]}
      />

      {selected && (
        <div className="mb-5 rounded-2xl border-l-4 bg-white p-4 shadow-sm" style={{ borderLeftColor: selected.color }}>
          <p className="font-semibold">
            {selected.emoji} {selected.label}
          </p>
          <p className="text-sm text-slate-600">{selected.description}</p>
          <p className="mt-1 text-sm">
            <strong>Examples:</strong> {selected.examples.join(', ')}
          </p>
          <p className="mt-1 text-sm">
            <strong>General rule:</strong> {selected.action}
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No matching items"
          message="Try another search term, or use Identify Waste to classify the item with AI."
          actionLabel="Clear search"
          onAction={() => {
            setSearch('');
            setParams({});
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <article key={i.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{i.name}</h3>
                <CategoryBadge category={i.category} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{i.action}</p>
              <ul className="mt-3 grid grid-cols-1 gap-1 text-xs">
                <Flag ok={i.canRecycle} label="Can recycle" />
                <Flag ok={i.canSell} label="Can sell" />
                <Flag ok={i.pickup} label="Pickup available" />
              </ul>
              <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Safety:</strong> {i.safety}
                </span>
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
