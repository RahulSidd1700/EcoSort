const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' };

export default function LoadingSpinner({ size = 'md', label }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span className={`${SIZES[size]} animate-spin rounded-full border-current border-t-transparent opacity-80`} />
      {label ? <span className="text-sm text-slate-600">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-brand-600">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
