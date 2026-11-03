"use client";

import {
  Bell,
  CreditCard,
  Files,
  FolderKanban,
  LayoutDashboard,
  Library,
  Package,
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

const ICONS: Record<string, LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/projects": FolderKanban,
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

export interface NavItem {
  href: string;
  label: string;
}

export interface SidebarProps {
  items: NavItem[];
  title?: string;
  footer?: ReactNode;
  onClose?: () => void;
}

export function Sidebar({ items, title = "JiooDev", footer, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink font-display text-sm text-paper">
            J
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink">
            {title}
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup navigasi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink md:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            const Icon = ICONS[item.href] ?? FolderKanban;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors duration-150 ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted"}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer ? <div className="border-t border-line p-3">{footer}</div> : null}
    </aside>
  );
}
