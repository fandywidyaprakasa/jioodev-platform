import type { ReactNode } from "react";
import { Card } from "./card";

export { Card };

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 font-display text-3xl text-ink">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-muted">{description}</p>
      ) : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
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
