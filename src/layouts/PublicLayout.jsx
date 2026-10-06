import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Logo from '../components/layout/Logo';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
          <Logo light />
          <p className="text-sm">
            © {new Date().getFullYear()} EcoSort — Sort Smart. Recycle Better. Keep Earth Cleaner.
          </p>
        </div>
      </footer>
    </div>
  );
}
