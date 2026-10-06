import { Component } from 'react';

/** Catches rendering errors so the app never shows a blank screen. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <p className="text-4xl" aria-hidden="true">
            🌿
          </p>
          <h1 className="mt-3 text-xl font-semibold">Something went wrong on this page.</h1>
          <p className="mt-1 text-sm text-slate-500">Please refresh the page or go back to the dashboard.</p>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <a className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium" href="/">
              Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
