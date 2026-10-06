import {
  ScanSearch,
  Tag,
  Truck,
  Award,
  Upload,
  Sparkles,
  Recycle,
  Leaf,
  ShieldCheck,
  BookOpen,
  TriangleAlert,
  ChartColumn,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { CATEGORIES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const HIGHLIGHTS = [
  {
    icon: ScanSearch,
    title: 'AI Waste Identification',
    text: 'Upload a photo and get the waste category with safe disposal advice.',
  },
  { icon: Tag, title: 'Sell Recyclables', text: 'List recyclable materials and e-waste for verified recyclers.' },
  { icon: Truck, title: 'Request Pickup', text: 'Schedule a doorstep collection and track it step by step.' },
  { icon: Award, title: 'Earn EcoPoints', text: 'Get rewarded every time you dispose of waste responsibly.' },
];

const STEPS = [
  { icon: Upload, title: 'Upload a photo', text: 'Take or upload a picture of the waste item.' },
  { icon: Sparkles, title: 'AI identifies it', text: 'EcoSort classifies it into one of five categories.' },
  { icon: Recycle, title: 'Choose an action', text: 'Sell it, request a pickup or follow the disposal guide.' },
  { icon: Leaf, title: 'Track your impact', text: 'Earn EcoPoints and see your estimated environmental impact.' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    text: 'Firebase Authentication, role-based access and security rules.',
  },
  { icon: Truck, title: 'Live pickup tracking', text: 'Real-time status updates from request to completion.' },
  { icon: BookOpen, title: 'Disposal guide', text: 'Searchable guide that works even without AI.' },
  { icon: TriangleAlert, title: 'Report problems', text: 'Report illegal dumping, burning or uncollected waste.' },
  { icon: ChartColumn, title: 'Dashboards', text: 'Clear analytics for users, collectors and administrators.' },
  { icon: Award, title: 'Rewards', text: 'EcoPoints and eco levels from Eco Starter to Green Champion.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <>
      {/* Hero */}
      <section id="home" className="bg-gradient-to-br from-brand-50 via-white to-emerald-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              AI-Enabled Smart Waste Management
            </span>
            <h1 className="mt-4 text-4xl leading-tight font-extrabold text-slate-900 md:text-5xl">
              Sort Smart. Recycle Better. <span className="text-brand-600">Keep Earth Cleaner.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              EcoSort helps you identify waste, choose the right disposal method, sell recyclable materials and request
              convenient waste collection.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" icon={ScanSearch} to={user ? '/identify' : '/login'}>
                Identify My Waste
              </Button>
              <Button size="lg" variant="outline" icon={Truck} to={user ? '/pickups/new' : '/login'}>
                Request Pickup
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 inline-flex rounded-xl bg-brand-600 p-2.5 text-white">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-900">How It Works</h2>
        <p className="mt-2 text-center text-slate-500">Four simple steps to responsible waste disposal.</p>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon size={24} aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-brand-700">STEP {i + 1}</p>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section id="categories" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900">Waste Categories</h2>
          <p className="mt-2 text-center text-slate-500">Every item is sorted into one of these five categories.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CATEGORIES.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border-t-4 bg-white p-5 shadow-sm"
                style={{ borderTopColor: c.color }}
              >
                <p className="text-3xl" aria-hidden="true">
                  {c.emoji}
                </p>
                <h3 className="mt-2 font-semibold">{c.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{c.description}</p>
                <p className="mt-2 text-xs text-slate-400">{c.examples.slice(0, 3).join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-900">Features</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
              <Icon size={24} className="shrink-0 text-brand-600" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-brand-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">About EcoSort</h2>
          <p className="mt-4 text-brand-50">
            EcoSort is an AI-enabled smart waste segregation, recycling and collection management system. It connects
            households, waste collectors/recyclers and administrators on one simple platform so that more waste is
            sorted correctly, recycled and kept away from landfills.
          </p>
          {!user && (
            <div className="mt-8 flex justify-center gap-3">
              <Button size="lg" variant="light" to="/register">
                Create free account
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
