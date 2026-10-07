import { useState } from 'react';
import { Eye, Trash2, Store } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import { Textarea } from '../../components/ui/FormFields';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import { useAdminData } from '../../hooks/useAdminData';
import { listingAction } from '../../services/listingService';
import { CATEGORY_MAP, LISTING_STATUSES, SELLABLE_CATEGORIES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, formatINR, formatStatus } from '../../utils/format';

export default function AdminMarketplace() {
  const d = useAdminData(['listings', 'users']);
  const [tab, setTab] = useState('listings');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const seller = (id) => d.users.find((u) => u.id === id);
  const term = search.trim().toLowerCase();
  const rows = d.listings.filter(
    (l) =>
      (!category || l.category === category) &&
      (!status || l.status === status) &&
      (!term || `${l.itemName} ${l.sellerName} ${l.buyerName || ''}`.toLowerCase().includes(term)),
  );
  const sold = d.listings.filter((l) => l.status === 'SOLD');

  const changeStatus = async (l, newStatus) => {
    if (!newStatus || newStatus === l.status) return;
    setBusy(l.id);
    try {
      await listingAction(l.id, 'admin_set_status', { status: newStatus });
      setMessage({ type: 'success', text: `"${l.itemName}" changed to ${formatStatus(newStatus)}.` });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not change the status.') });
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    setBusy(removing.id);
    try {
      await listingAction(removing.id, 'admin_remove', { reason: reason || 'Inappropriate listing' });
      setMessage({ type: 'success', text: `"${removing.itemName}" was removed and the seller was notified.` });
      setRemoving(null);
      setReason('');
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not remove the listing.') });
    } finally {
      setBusy('');
    }
  };

  const s = selected && seller(selected.sellerId);

  return (
    <div className="fade-in">
      <PageHeader
        title="Marketplace Management"
        subtitle="Review listings, change status, remove inappropriate content and view transactions."
      />
      <div className="mb-4 flex gap-2" role="tablist">
        {[
          ['listings', `Listings (${d.listings.length})`],
          ['transactions', `Transactions (${sold.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>

      {tab === 'listings' && (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search item, seller or buyer..."
            filters={[
              {
                label: 'Categories',
                value: category,
                onChange: setCategory,
                options: SELLABLE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_MAP[c].label })),
              },
              {
                label: 'Statuses',
                value: status,
                onChange: setStatus,
                options: LISTING_STATUSES.map((x) => ({ value: x, label: formatStatus(x) })),
              },
            ]}
          />
          {d.loading ? (
            <ListSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState icon={Store} title="No marketplace listings found." />
          ) : (
            <DataTable
              caption="Listings"
              rows={rows}
              columns={[
                {
                  key: 'item',
                  label: 'Item',
                  render: (l) => (
                    <>
                      <p className="font-medium">{l.itemName}</p>
                      <p className="text-xs text-slate-500">
                        {l.quantity} {l.unit} · {formatINR(l.expectedPrice)}
                      </p>
                    </>
                  ),
                },
                { key: 'category', label: 'Category', render: (l) => <CategoryBadge category={l.category} /> },
                {
                  key: 'seller',
                  label: 'Seller',
                  render: (l) => (
                    <>
                      <p>{l.sellerName}</p>
                      <p className="text-xs text-slate-500">{l.sellerArea}</p>
                    </>
                  ),
                },
                {
                  key: 'buyer',
                  label: 'Buyer / offer',
                  render: (l) => (l.buyerName ? `${l.buyerName} · ${formatINR(l.offerPrice)}` : '-'),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (l) => (
                    <select
                      aria-label={`Status of ${l.itemName}`}
                      value={l.status}
                      disabled={busy === l.id}
                      onChange={(e) => changeStatus(l, e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      {LISTING_STATUSES.map((x) => (
                        <option key={x} value={x}>
                          {formatStatus(x)}
                        </option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (l) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => setSelected(l)}
                        aria-label={`View ${l.itemName}`}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        icon={Trash2}
                        onClick={() => setRemoving(l)}
                        aria-label={`Remove ${l.itemName}`}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {tab === 'transactions' &&
        (d.loading ? (
          <ListSkeleton />
        ) : sold.length === 0 ? (
          <EmptyState icon={Store} title="No completed transactions yet." />
        ) : (
          <DataTable
            caption="Completed transactions"
            rows={sold}
            columns={[
              { key: 'itemName', label: 'Item' },
              { key: 'category', label: 'Category', render: (l) => <CategoryBadge category={l.category} /> },
              { key: 'sellerName', label: 'Seller' },
              { key: 'buyerName', label: 'Buyer' },
              { key: 'price', label: 'Agreed price', render: (l) => formatINR(l.offerPrice) },
              { key: 'soldAt', label: 'Completed on', render: (l) => formatDate(l.soldAt || l.updatedAt) },
            ]}
          />
        ))}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.itemName || 'Listing'}
        size="lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-2">
              <CategoryBadge category={selected.category} />
              <StatusBadge status={selected.status} />
            </div>
            {selected.description && <p className="text-slate-600">{selected.description}</p>}
            <section>
              <h3 className="font-semibold">Seller information</h3>
              <p>
                {selected.sellerName} · {s?.email || '-'} · {s?.phone || '-'}
              </p>
              <p className="text-slate-500">{s?.address || selected.sellerArea || '-'}</p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">Transaction history</h3>
              {selected.history?.length ? (
                <ol className="space-y-1 border-l-2 border-slate-200 pl-3">
                  {selected.history.map((h, i) => (
                    <li key={i}>
                      <strong>{formatStatus(h.status)}</strong> — {h.note}{' '}
                      <span className="text-xs text-slate-400">
                        ({h.byName}, {formatDate(h.at, true)})
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-slate-500">No status changes yet.</p>
              )}
            </section>
            <Button size="sm" variant="secondary" to={`/marketplace/${selected.id}`}>
              Open listing page
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove listing"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy === removing?.id} onClick={remove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          “{removing?.itemName}” will be deleted and the seller will be notified.
        </p>
        <Textarea
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Prohibited item, misleading description"
        />
      </Modal>
    </div>
  );
}
