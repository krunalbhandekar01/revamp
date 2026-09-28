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

  /** A failed dynamic import reads very differently from a bug in the screen. */
  private isChunkError(error: Error): boolean {
    return /dynamically imported module|Importing a module script failed|Loading chunk/i.test(
      error.message,
    );
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-critical-soft">
          <AlertTriangle className="size-6 text-critical" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-ink">
          {this.isChunkError(this.state.error) ? 'A newer version was deployed' : 'This screen hit an error'}
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-ink-secondary">
          {this.isChunkError(this.state.error)
            ? 'This tab is running an older build whose files are no longer on the server. Reload to pick up the current version.'
            : 'The rest of the panel is still working. Reloading usually clears it.'}
        </p>
        <pre className="mt-3 max-w-lg overflow-x-auto rounded-md border border-line bg-surface-3 p-2.5 text-left font-mono text-[11px] text-ink-secondary">
          {this.state.error.message}
        </pre>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() =>
            this.isChunkError(this.state.error!)
              ? window.location.reload()
              : this.setState({ error: null })
          }
        >
          {this.isChunkError(this.state.error) ? 'Reload' : 'Try again'}
        </Button>
      </div>
    );
  }
}
