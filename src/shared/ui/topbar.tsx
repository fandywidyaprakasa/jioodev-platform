import type { ReactNode } from "react";

export interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onMenu?: () => void;
}

export function Topbar({ title, subtitle, actions, onMenu }: TopbarProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Buka navigasi"
            className="rounded-md border border-line px-2.5 py-1.5 text-sm text-muted hover:text-ink md:hidden"
          >
            Menu
          </button>
        ) : null}
        <div>
          <p className="font-display text-xl text-ink">{title}</p>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
