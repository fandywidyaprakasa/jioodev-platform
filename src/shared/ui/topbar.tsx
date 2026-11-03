import { Menu } from "lucide-react";
import type { ReactNode } from "react";

export interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onMenu?: () => void;
}

export function Topbar({ title, subtitle, actions, onMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Buka navigasi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors duration-150 hover:text-ink md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
