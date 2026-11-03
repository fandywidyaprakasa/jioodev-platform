import type { ReactNode } from "react";

export interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold leading-none tracking-[-0.035em] text-ink tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}
