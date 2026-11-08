"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

export interface SectionToolbarProps {
  slot: string;
  slotName: string;
  enabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canReorder: boolean;
  canVariant: boolean;
  variants?: { code: string; name: string }[];
  currentVariant?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onVariantChange?: (variant: string) => void;
}

export function SectionToolbar({
  slot,
  slotName,
  enabled,
  canMoveUp,
  canMoveDown,
  canReorder,
  canVariant,
  variants = [],
  currentVariant,
  onMoveUp,
  onMoveDown,
  onToggle,
  onVariantChange,
}: SectionToolbarProps) {
  return (
    <div
      data-testid="workspace-section-toolbar"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        pointerEvents: "auto",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          background: "var(--color-surface, #f9fafb)",
          border: "1px solid var(--color-line, #e5e7eb)",
          borderRadius: 0,
          padding: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {canReorder && canMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={`Naikkan ${slotName}`}
            title="Naikkan"
            style={{
              display: "grid",
              placeItems: "center",
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              color: "var(--color-ink, #111827)",
              cursor: canMoveUp ? "pointer" : "not-allowed",
              opacity: canMoveUp ? 1 : 0.4,
              borderRadius: 0,
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (canMoveUp)
                e.currentTarget.style.backgroundColor =
                  "var(--color-paper, #ffffff)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {canReorder && canMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={`Turunkan ${slotName}`}
            title="Turunkan"
            style={{
              display: "grid",
              placeItems: "center",
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              color: "var(--color-ink, #111827)",
              cursor: canMoveDown ? "pointer" : "not-allowed",
              opacity: canMoveDown ? 1 : 0.4,
              borderRadius: 0,
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (canMoveDown)
                e.currentTarget.style.backgroundColor =
                  "var(--color-paper, #ffffff)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {(canReorder && (canMoveUp || canMoveDown)) &&
          (canVariant || enabled !== undefined) && (
            <div
              style={{
                width: "100%",
                height: 1,
                background: "var(--color-line, #e5e7eb)",
                margin: "2px 0",
              }}
            />
          )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={enabled ? `Sembunyikan ${slotName}` : `Tampilkan ${slotName}`}
          title={enabled ? "Sembunyikan" : "Tampilkan"}
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            color: "var(--color-ink, #111827)",
            cursor: "pointer",
            borderRadius: 0,
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-paper, #ffffff)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {enabled ? (
            <Eye className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {canVariant && variants.length > 0 && onVariantChange && (
        <div
          style={{
            background: "var(--color-surface, #f9fafb)",
            border: "1px solid var(--color-line, #e5e7eb)",
            borderRadius: 0,
            padding: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--color-muted, #6b7280)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Varian
            <select
              value={currentVariant ?? ""}
              onChange={(e) => onVariantChange(e.target.value)}
              style={{
                fontSize: "11px",
                padding: "4px 8px",
                border: "1px solid var(--color-line, #e5e7eb)",
                borderRadius: 0,
                background: "var(--color-paper, #ffffff)",
                color: "var(--color-ink, #111827)",
                cursor: "pointer",
                appearance: "none",
                minWidth: 120,
              }}
            >
              {variants.map((variant) => (
                <option key={variant.code} value={variant.code}>
                  {variant.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}