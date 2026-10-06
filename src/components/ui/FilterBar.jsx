import { Search } from 'lucide-react';

/** Search box + any number of select filters in one responsive row. */
export default function FilterBar({ search, onSearch, searchPlaceholder = 'Search...', filters = [], children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
      {onSearch && (
        <label className="relative flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
          />
        </label>
      )}
      {filters.map((f) => (
        <label key={f.label} className="md:w-48">
          <span className="sr-only">{f.label}</span>
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            aria-label={f.label}
          >
            <option value="">{f.allLabel || `All ${f.label}`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {children}
    </div>
  );
}
