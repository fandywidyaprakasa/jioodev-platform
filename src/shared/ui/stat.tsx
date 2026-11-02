import type { ReactNode } from "react";

export interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
