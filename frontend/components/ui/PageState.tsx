import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700"
        aria-hidden="true"
      />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {children ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{children}</p>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-neutral-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
