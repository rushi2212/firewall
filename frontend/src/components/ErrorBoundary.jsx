import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // TODO: send error to monitoring service
    // console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell flex min-h-screen items-center justify-center p-4">
          <div className="panel w-full max-w-xl p-6 text-center">
            <h2 className="text-xl font-bold text-[var(--app-text)]">Something went wrong</h2>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              An unexpected error occurred. Please refresh the page or contact support.
            </p>
            <pre className="panel-muted mt-4 max-h-40 overflow-auto p-3 text-left text-xs text-[var(--app-danger)]">{String(this.state.error)}</pre>
            <button
              className="btn btn-primary mt-4"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
