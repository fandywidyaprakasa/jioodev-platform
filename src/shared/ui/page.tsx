import type { ReactNode } from "react";
import { Card } from "./card";

export { Card };

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-line pb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.08] tracking-[-0.025em] text-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Scaffold({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-5 text-sm text-muted">
      <p className="mb-2 font-medium text-ink">Scaffold</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
