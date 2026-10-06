import Logo from './layout/Logo';

/** Shown instead of a blank screen when the .env Firebase config is missing. */
export default function FirebaseSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Logo />
        <h1 className="mt-4 text-xl font-semibold">Firebase is not configured yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1">.env</code> and fill in your Firebase web app settings, or set{' '}
          <code className="rounded bg-slate-100 px-1">VITE_USE_EMULATORS=true</code> to use the local Firebase Emulator
          Suite. Then restart <code className="rounded bg-slate-100 px-1">npm run dev</code>.
        </p>
        <p className="mt-2 text-sm text-slate-600">See README.md → “Firebase setup” for step-by-step instructions.</p>
      </div>
    </div>
  );
}
