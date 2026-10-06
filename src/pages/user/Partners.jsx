import { useState } from 'react';
import { Building2, Phone, Mail, MapPin } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import FilterBar from '../../components/ui/FilterBar';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeActivePartners } from '../../services/partnerService';
import { PARTNER_TYPES } from '../../utils/constants';

export default function Partners() {
  const { data, loading, error } = useRealtime((ok, fail) => subscribeActivePartners(ok, fail), []);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const term = search.trim().toLowerCase();
  const partners = data.filter(
    (p) =>
      (!type || p.type === type) && (!term || `${p.name} ${p.serviceArea} ${p.address}`.toLowerCase().includes(term)),
  );

  return (
    <div className="fade-in">
      <PageHeader
        title="Recycling Partners"
        subtitle="Verified recyclers and collection partners working with EcoSort."
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name or area..."
        filters={[
          {
            label: 'Types',
            value: type,
            onChange: setType,
            options: PARTNER_TYPES.map((t) => ({ value: t, label: t })),
          },
        ]}
      />
      <Alert type="error" className="mb-4">
        {error}
      </Alert>
      {loading ? (
        <CardGridSkeleton count={3} className="h-48" />
      ) : partners.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No partners found"
          message="Active recycling partners will be listed here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm text-brand-700">{p.type}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(p.categories || []).map((c) => (
                  <CategoryBadge key={c} category={c} />
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {p.serviceArea && (
                  <li className="flex gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Serves: {p.serviceArea}
                  </li>
                )}
                {p.address && (
                  <li className="flex gap-2">
                    <Building2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {p.address}
                  </li>
                )}
                {p.phone && (
                  <li className="flex gap-2">
                    <Phone size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{' '}
                    <a href={`tel:${p.phone}`} className="hover:underline">
                      {p.phone}
                    </a>
                  </li>
                )}
                {p.email && (
                  <li className="flex gap-2">
                    <Mail size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{' '}
                    <a href={`mailto:${p.email}`} className="hover:underline">
                      {p.email}
                    </a>
                  </li>
                )}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
