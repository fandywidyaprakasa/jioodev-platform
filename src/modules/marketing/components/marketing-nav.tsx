"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const MARKETING_NAV = [
  { href: "/features", label: "Fitur" },
  { href: "/pricing", label: "Harga" },
  { href: "/templates", label: "Template" },
  { href: "/contact", label: "Kontak" },
];

export function MarketingNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "Navigasi mobile" : "Navigasi utama"}
      className={mobile ? "" : "ml-auto hidden gap-6 sm:flex"}
    >
      {MARKETING_NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `block rounded px-3 py-2.5 ${
                    active ? "bg-paper font-medium text-ink" : "text-muted hover:bg-paper hover:text-ink"
                  }`
                : `text-sm underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline ${
                    active
                      ? "font-medium text-ink underline decoration-accent decoration-2"
                      : "text-muted"
                  }`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
