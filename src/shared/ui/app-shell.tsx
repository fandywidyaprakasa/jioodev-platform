"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "./command-palette";
import { Sidebar, type NavItem } from "./sidebar";
import { ThemeSwitcher } from "./theme-switcher";
import { Topbar } from "./topbar";

export interface AppShellProps {
  brand: string;
  title: string;
  subtitle?: string;
  items: NavItem[];
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  brand,
  title,
  subtitle,
  items,
  actions,
  footer,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <Sidebar items={items} title={brand} footer={footer} />
        </div>

        {open ? (
          <div className="fixed inset-0 z-[60] md:hidden">
            <button
              type="button"
              aria-label="Tutup navigasi"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/40"
            />
            <div className="relative flex h-full w-64">
              <Sidebar
                items={items}
                title={brand}
                footer={footer}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            subtitle={subtitle}
            actions={
              <>
                <ThemeSwitcher />
                <CommandPalette items={items} />
                {actions}
              </>
            }
            onMenu={() => setOpen(true)}
          />
          <main id="konten" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
