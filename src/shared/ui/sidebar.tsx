"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export interface SidebarProps {
  items: NavItem[];
  title?: string;
  footer?: ReactNode;
}

export function Sidebar({ items, title = "JiooDev", footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-4 py-4">
        <Link href="/" className="font-display text-lg text-ink">
          {title}
        </Link>
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  {item.label}
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
