"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./command-palette";
import { isNavItemActive, Sidebar, type NavItem } from "./sidebar";
import { ThemeSwitcher } from "./theme-switcher";
import { Topbar } from "./topbar";

export interface AppShellProps {
  brand: string;
  title: string;
  subtitle?: string;
  items: NavItem[];
  homeHref?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  brand,
  title,
  subtitle,
  items,
  homeHref = "/",
  actions,
  footer,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const activeItem = items
    .filter((item) => isNavItemActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const topbarTitle = activeItem?.label ?? title;
  const fullBleed = pathname?.includes("/workspace") ?? false;

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem("jioodev:sidebar-collapsed") === "1",
      );
    } catch {
      // Ignore storage restrictions.
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(
          "jioodev:sidebar-collapsed",
          next ? "1" : "0",
        );
      } catch {
        // Ignore storage restrictions.
      }
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const timer = window.setTimeout(() => focusable()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  return (
    <div
      className={
        fullBleed
          ? "min-h-screen bg-paper lg:h-screen lg:overflow-hidden"
          : "min-h-screen bg-paper"
      }
    >
      <div className={fullBleed ? "flex min-h-screen lg:h-screen" : "flex min-h-screen"}>
        <div className="hidden md:block">
          <Sidebar
            items={items}
            title={brand}
            homeHref={homeHref}
            footer={footer}
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
        </div>

        {open ? (
          <div className="fixed inset-0 z-[60] md:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Tutup navigasi"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink/40"
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi"
              className="relative flex h-full w-64"
            >
              <Sidebar
                items={items}
                title={brand}
                homeHref={homeHref}
                footer={footer}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar
            title={topbarTitle}
            subtitle={subtitle}
            brand={brand}
            homeHref={homeHref}
            menuOpen={open}
            actions={
              <>
                <ThemeSwitcher />
                <CommandPalette items={items} />
                {actions}
              </>
            }
            onMenu={() => setOpen(true)}
          />
          <main
            id="konten"
            className={
              fullBleed
                ? "flex min-h-0 min-w-0 flex-1 flex-col"
                : "min-w-0 flex-1 px-4 py-6 sm:px-6"
            }
          >
            <div
              className={
                fullBleed
                  ? "flex min-h-0 w-full flex-1 flex-col"
                  : "mx-auto w-full max-w-7xl"
              }
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
