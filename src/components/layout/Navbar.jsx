import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import Button from '../ui/Button';
import { useAuth, homePathForRole } from '../../hooks/useAuth';

const LINKS = [
  { href: '/#home', label: 'Home' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#categories', label: 'Waste Categories' },
  { href: '/#features', label: 'Features' },
  { href: '/#about', label: 'About' },
];

/** Public navigation bar with a mobile menu. */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, role } = useAuth();

  const authButtons = user ? (
    <Button to={homePathForRole(role)}>Go to Dashboard</Button>
  ) : (
    <>
      <Button variant="ghost" to="/login">
        Login
      </Button>
      <Button to="/register">Register</Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm font-medium text-slate-600 hover:text-brand-700">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">{authButtons}</div>
        <button
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-brand-50"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">{authButtons}</div>
        </div>
      )}
    </header>
  );
}
