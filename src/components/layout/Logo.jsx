import { Link } from 'react-router-dom';
import { Recycle } from 'lucide-react';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="EcoSort home">
      <span className="rounded-xl bg-brand-600 p-1.5 text-white">
        <Recycle size={22} aria-hidden="true" />
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Eco<span className="text-brand-600">Sort</span>
      </span>
    </Link>
  );
}
