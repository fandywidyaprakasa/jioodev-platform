"use client";

import { Command, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "./modal";
import type { NavItem } from "./sidebar";

export function CommandPalette({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  function go(item: NavItem) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:border-ink/40 hover:text-ink"
        aria-label="Buka pencarian (Command K)"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Cari</span>
        <kbd className="hidden items-center gap-0.5 rounded border border-line px-1 py-0.5 text-[10px] sm:flex">
          <Command className="h-2.5 w-2.5" aria-hidden="true" />K
        </kbd>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Cari halaman">
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => Math.min(results.length - 1, current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter" && results[active]) {
              event.preventDefault();
              go(results[active]);
            }
          }}
          placeholder="Ketik nama halaman…"
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
          aria-label="Kata kunci"
        />
        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto" role="listbox">
          {results.map((item, index) => (
            <li key={item.href}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  index === active
                    ? "bg-accent-soft text-accent"
                    : "text-ink hover:bg-paper"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted">{item.href}</span>
              </button>
            </li>
          ))}
          {!results.length ? (
            <li className="px-3 py-2 text-sm text-muted">Tidak ada hasil.</li>
          ) : null}
        </ul>
      </Modal>
    </>
  );
}
