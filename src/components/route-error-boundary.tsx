import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * User-friendly React route error boundary.
 * Renders a recoverable clinical error screen when an uncaught exception
 * occurs during route resolution, module fetching, or component rendering.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred in the clinical application.";
  let errorTitle = "Runtime Error Encountered";

  if (isRouteErrorResponse(error)) {
    errorTitle = `${error.status} ${error.statusText || "Navigation Error"}`;
    errorMessage = error.data?.message || "The requested clinical screen could not be resolved.";
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Arogya Mithra Clinical Guard
          </span>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            {errorTitle}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {error instanceof Error && error.stack && (
          <details className="text-left rounded-lg bg-muted/40 p-3 border border-border/60 text-[11px] font-mono text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground select-none">
              Technical Diagnostics
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap max-h-36 clinical-scrollbar">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="size-3.5" />}
            className="w-full sm:w-auto"
          >
            Reload Screen
          </Button>
          <Link to="/app/dashboard" className="w-full sm:w-auto">
            <Button
              variant="teal"
              size="sm"
              leftIcon={<Home className="size-3.5" />}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

