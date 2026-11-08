"use client";

import React from "react";
import { X } from "lucide-react";
import type { FriendlyField } from "./inspector-field";
import { FieldComponent } from "./inspector-field";

type WorkspaceVariant = {
  code: string;
  name: string;
};

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedBlock: { slot: string; variant: string; enabled: boolean; order: number } | null;
  variants: WorkspaceVariant[];
  friendlyFields: FriendlyField[];
  data: { slots?: Record<string, { name?: string }> } | null;
  can: (cap: string) => boolean;
  unsupportedReason: (cap: string) => string;
  changeVariant: (slot: string, value: string) => void;
  editField: (path: string[], value: string) => void;
  endFieldEdit: () => void;
};

export function MobileDrawer({
  isOpen,
  onClose,
  selectedBlock,
  variants,
  friendlyFields,
  data,
  can,
  unsupportedReason,
  changeVariant,
  editField,
  endFieldEdit,
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const slotName =
    (selectedBlock ? data?.slots?.[selectedBlock.slot]?.name : undefined) ??
    selectedBlock?.slot ??
    "";

  const children: any[] = [];
  children.push(
    React.createElement(
      "div",
      { className: "mb-3 flex items-center justify-between gap-2", key: "header" },
      React.createElement("h2", { className: "text-sm font-semibold text-ink" }, "Inspector"),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: onClose,
          "aria-label": "Tutup inspector",
          className:
            "grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-paper hover:text-ink",
        },
        React.createElement(X, { className: "h-4 w-4", "aria-hidden": true }),
      ),
    ),
  );

  if (selectedBlock) {
    const body: any[] = [];
    body.push(
      React.createElement(
        "div",
        { key: "slot" },
        React.createElement("p", { className: "text-[10px] uppercase tracking-wide text-muted" }, "Slot"),
        React.createElement("p", { className: "text-sm font-medium text-ink" }, slotName),
      ),
    );

    body.push(
      React.createElement(
        "div",
        { key: "variant" },
        React.createElement(
          "label",
          { className: "block text-xs text-muted" },
          "Variant",
          React.createElement("select", {
            className: "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink",
            value: selectedBlock.variant,
            disabled: !can("section.variant.select"),
            title: unsupportedReason("section.variant.select"),
            onChange: (event: any) => changeVariant(selectedBlock.slot, event.target.value),
          }, (variants || []).map((variant) =>
            React.createElement("option", { key: variant.code, value: variant.code }, variant.name),
          )),
        ),
        (variants || []).length
          ? React.createElement(
              "div",
              { className: "mt-2 flex flex-wrap gap-1" },
              (variants || []).map((variant) => {
                const chosen = selectedBlock.variant === variant.code;
                return React.createElement(
                  "button",
                  {
                    key: variant.code,
                    type: "button",
                    onClick: () => changeVariant(selectedBlock.slot, variant.code),
                    disabled: !can("section.variant.select"),
                    "aria-pressed": chosen,
                    title: unsupportedReason("section.variant.select"),
                    className: `rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-150 ${
                      chosen ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
                    } disabled:opacity-40`,
                  },
                  variant.name,
                );
              }),
            )
          : null,
      ),
    );

    if (friendlyFields && friendlyFields.length) {
      body.push(
        React.createElement(
          "div",
          {
            className: "space-y-3 border-t border-line pt-3",
            "data-testid": "workspace-friendly-fields",
            key: "fields",
          },
          friendlyFields.map((field) => {
            const fieldId = `workspace-field-${selectedBlock.slot}-${field.path.join("-")}`;
            return React.createElement(
              "label",
              { key: fieldId, htmlFor: fieldId, className: "block text-xs text-muted" },
              field.label,
              React.createElement(FieldComponent, {
                field,
                fieldId,
                disabled: !can("section.content.edit"),
                onChange: editField,
                onBlur: endFieldEdit,
              }),
            );
          }),
        ),
      );
    } else {
      body.push(
        React.createElement(
          "p",
          { className: "border-t border-line pt-3 text-xs text-muted", key: "nofields" },
          "Slot ini tidak memiliki field teks sederhana. Gunakan editor JSON lanjutan di bawah untuk mengubah strukturnya.",
        ),
      );
    }

    body.push(
      React.createElement(
        "div",
        { className: "mt-4 flex justify-end gap-2", key: "actions" },
        React.createElement(
          "button",
          { type: "button", onClick: onClose, className: "rounded-md bg-paper px-3 py-1 text-sm text-muted hover:bg-surface transition-colors", "aria-label": "Batal" },
          "Batal",
        ),
      ),
    );

    children.push(React.createElement("div", { className: "space-y-4", key: "body" }, body));
  } else {
    children.push(React.createElement("p", { className: "text-sm text-muted", key: "empty" }, "Pilih section di daftar atau kanvas."));
  }

  return React.createElement(
    "div",
    { className: "fixed inset-0 z-50 lg:hidden", role: "dialog", "aria-modal": true },
    React.createElement("div", {
      className: "absolute inset-0 bg-black/30 backdrop-blur-sm",
      onClick: onClose,
      "aria-hidden": true,
    }),
    React.createElement(
      "div",
      { className: "absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-auto rounded-t-xl border-t border-line bg-surface p-4 shadow-xl transition-transform duration-300 ease-out" },
      children,
    ),
  );
}
