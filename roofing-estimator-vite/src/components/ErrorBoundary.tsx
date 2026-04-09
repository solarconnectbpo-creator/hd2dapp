import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";

type Props = { children: ReactNode; title?: string };

type State = { hasError: boolean; message: string };

/**
 * Catches render errors in child trees so the whole shell (nav, auth) stays usable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="mx-auto max-w-lg rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-[#e7e9ea]"
          role="alert"
        >
          <h2 className="text-lg font-semibold text-red-200">
            {this.props.title ?? "This section crashed"}
          </h2>
          <p className="mt-2 text-sm text-red-100/90">{this.state.message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-[#1d9bf0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a8cd8]"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try again
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#e7e9ea] hover:bg-white/[0.1]"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <Link
              to="/"
              className="text-sm font-semibold text-sky-400 underline-offset-2 hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
