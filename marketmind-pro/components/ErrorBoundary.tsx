'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallbackTitle?: string }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('UI error', error, info); /* Fase 5: Sentry.captureException */ }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
        <p className="font-semibold">{this.props.fallbackTitle ?? 'Bagian ini mengalami error'}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-3 rounded-lg bg-red-500 px-3 py-1.5 font-medium text-white hover:bg-red-400">Coba Lagi</button>
      </div>
    );
  }
}
