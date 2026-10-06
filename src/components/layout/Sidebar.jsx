import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Logo from './Logo';
import { NAV_ITEMS } from './navConfig';

/** Role-based side navigation. On mobile it slides in as a drawer. */
export default function Sidebar({ role, open, onClose, onLogout, unreadCount }) {
  const items = NAV_ITEMS[role] || [];
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Logo to="/" />
        </div>
        <p className="px-5 pt-4 pb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {role === 'admin' ? 'Administration' : role === 'collector' ? 'Collector / Recycler' : 'My EcoSort'}
        </p>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {to === '/notifications' && unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{unreadCount}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
