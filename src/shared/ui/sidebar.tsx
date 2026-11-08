"use client";

import {
  Bell,
  CreditCard,
  Files,
  FolderKanban,
  LayoutDashboard,
  Library,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isNavItemActive, type NavItem } from "@/shared/lib/nav";

export type { NavItem } from "@/shared/lib/nav";
export { isNavItemActive } from "@/shared/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/projects": FolderKanban,
  "/app/templates": Library,
  "/app/account": UserRound,
  "/app/account/notifications": Bell,
  "/app/account/invoices": ReceiptText,
  "/app/account/subscription": CreditCard,
  "/app/account/settings": Settings,
  "/admin": LayoutDashboard,
  "/admin/projects": FolderKanban,
  "/admin/packages": Package,
  "/admin/payments": Wallet,
  "/admin/deploy": Rocket,
  "/admin/content": Library,
  "/admin/settings": Settings,
  "/admin/audit": ScrollText,
  "/admin/users": ShieldCheck,
  "/admin/files": Files,
};

export interface SidebarProps {
  items: NavItem[];
  title?: string;
  homeHref?: string;
  footer?: ReactNode;
  onClose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  items,
  title = "JiooDev",
  homeHref = "/",
  footer,
  onClose,
  collapsed = false,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const groups = items.reduce<Array<{ name?: string; items: NavItem[] }>>(
    (result, item) => {
      const last = result[result.length - 1];
      if (last && last.name === item.group) last.items.push(item);
      else result.push({ name: item.group, items: [item] });
      return result;
    },
    [],
  );

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-line py-4 ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link
          href={homeHref}
          className={`flex min-w-0 items-center gap-2.5 ${
            collapsed ? "justify-center" : ""
          }`}
          aria-label={title}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink font-display text-sm text-paper">
            J
          </span>
          {!collapsed ? (
            <span className="truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              {title}
            </span>
          ) : null}
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface md:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto p-2">
        {groups.map((group, groupIndex) => (
          <div key={group.name ?? `group-${groupIndex}`}>
            {group.name && !collapsed ? (
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {group.name}
              </p>
            ) : null}
            {group.name && collapsed && groupIndex > 0 ? (
              <div className="mx-2 my-2 border-t border-line" />
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item);
                const Icon = ICONS[item.href] ?? FolderKanban;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex min-h-11 items-center rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                        collapsed ? "justify-center px-0" : "gap-2.5 px-3"
                      } ${
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-muted hover:bg-paper hover:text-ink"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted"}`}
                        aria-hidden="true"
                      />
                      {!collapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {onToggle ? (
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className={`flex min-h-11 w-full items-center rounded-md text-xs font-medium text-muted transition-colors duration-150 hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              collapsed ? "justify-center" : "gap-2.5 px-3"
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
            {!collapsed ? <span>Ciutkan</span> : null}
          </button>
        </div>
      ) : null}
      {footer && !collapsed ? (
        <div className="border-t border-line p-3">{footer}</div>
      ) : null}
    </aside>
  );
}
