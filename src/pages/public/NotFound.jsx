import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl" aria-hidden="true">
        🍃
      </p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-slate-500">The page you are looking for doesn't exist or has moved.</p>
      <Button to="/">Back to home</Button>
    </div>
  );
}
