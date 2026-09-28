import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * A render error in one screen should not blank the whole panel.
 * Wrapped around the routed outlet, so the shell survives.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Wire this to Sentry when the real backend lands.
    console.error('[panel] render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-critical-soft">
          <AlertTriangle className="size-6 text-critical" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-ink">This screen hit an error</h2>
        <p className="mt-1.5 max-w-md text-sm text-ink-secondary">
          The rest of the panel is still working. Reloading usually clears it.
        </p>
        <pre className="mt-3 max-w-lg overflow-x-auto rounded-md border border-line bg-surface-3 p-2.5 text-left font-mono text-[11px] text-ink-secondary">
          {this.state.error.message}
        </pre>
        <Button variant="primary" className="mt-4" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
