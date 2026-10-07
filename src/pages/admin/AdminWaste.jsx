import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import { useAdminData } from '../../hooks/useAdminData';
import { deleteWasteRecord } from '../../services/wasteService';
import { CATEGORIES, CATEGORY_MAP } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, formatRange } from '../../utils/format';

export default function AdminWaste() {
  const d = useAdminData(['waste', 'users']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const userName = (id) => d.users.find((u) => u.id === id)?.name || 'Unknown user';
  const term = search.trim().toLowerCase();
  const rows = d.wasteItems.filter(
    (w) =>
      (!category || w.category === category) &&
      (!source || w.source === source) &&
      (!term || `${w.itemName} ${userName(w.userId)}`.toLowerCase().includes(term)),
  );
  const counts = CATEGORIES.map((c) => ({ ...c, count: d.wasteItems.filter((w) => w.category === c.id).length }));

  const remove = async (w) => {
    if (!window.confirm(`Delete waste record "${w.itemName}"?`)) return;
    try {
      await deleteWasteRecord(w.id);
      setMessage({ type: 'success', text: 'Waste record deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not delete the record.') });
    }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Waste Records" subtitle="All AI and manual waste classifications." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xl" aria-hidden="true">
              {c.emoji}
            </p>
            <p className="text-lg font-bold">{c.count}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search item or user..."
        filters={[
          {
            label: 'Categories',
            value: category,
            onChange: setCategory,
            options: CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
          },
          {
            label: 'Sources',
            value: source,
            onChange: setSource,
            options: [
              { value: 'ai', label: 'AI' },
              { value: 'manual', label: 'Manual' },
            ],
          },
        ]}
      />
      {d.loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No waste records." message="Classifications made by users will appear here." />
      ) : (
        <DataTable
          caption="Waste records"
          rows={rows}
          columns={[
            {
              key: 'img',
                label: 'Type',
                render: (w) => <span className="text-2xl" aria-hidden="true">{CATEGORY_MAP[w.category]?.emoji}</span>,
            },
            { key: 'itemName', label: 'Item', render: (w) => <span className="font-medium">{w.itemName}</span> },
            { key: 'category', label: 'Category', render: (w) => <CategoryBadge category={w.category} /> },
            {
              key: 'confidence',
              label: 'Confidence',
              render: (w) =>
                w.confidence === null || w.confidence === undefined ? '-' : `${Math.round(w.confidence * 100)}%`,
            },
            { key: 'source', label: 'Source', render: (w) => (w.source === 'ai' ? 'AI' : 'Manual') },
            {
              key: 'value',
              label: 'Est. value',
              render: (w) =>
                w.estimatedValueMin === null || w.estimatedValueMin === undefined
                  ? '-'
                  : formatRange(w.estimatedValueMin, w.estimatedValueMax),
            },
            { key: 'user', label: 'User', render: (w) => userName(w.userId) },
            { key: 'createdAt', label: 'Date', render: (w) => formatDate(w.createdAt) },
            {
              key: 'actions',
              label: '',
              render: (w) => (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  icon={Trash2}
                  onClick={() => remove(w)}
                  aria-label={`Delete ${w.itemName}`}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
