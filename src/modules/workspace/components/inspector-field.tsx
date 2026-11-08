"use client";

import React from "react";
import type { ChangeEvent } from "react";

export type FriendlyFieldType = "text" | "textarea" | "enum" | "link";

export type FriendlyField = {
  path: string[];
  label: string;
  value: string;
  type: FriendlyFieldType;
  multiline?: boolean;
  options?: string[];
};

export type FieldComponentProps = {
  field: FriendlyField;
  fieldId: string;
  disabled: boolean;
  onChange: (path: string[], value: string) => void;
  onBlur: () => void;
};

export function FieldComponent({
  field,
  fieldId,
  disabled,
  onChange,
  onBlur,
}: FieldComponentProps) {
  const { type, value, options } = field;

  if (type === "textarea") {
    return React.createElement("textarea", {
      id: fieldId,
      "data-testid": fieldId,
      value,
      disabled,
      onChange: (e: ChangeEvent<HTMLTextAreaElement>) =>
        onChange(field.path, e.target.value),
      onBlur,
      className:
        "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink disabled:opacity-60",
      rows: 3,
    });
  }

  if (type === "enum" && options && options.length > 0) {
    return React.createElement(
      "select",
      {
        id: fieldId,
        "data-testid": fieldId,
        value,
        disabled,
        onChange: (e: ChangeEvent<HTMLSelectElement>) =>
          onChange(field.path, e.target.value),
        onBlur,
        className:
          "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink disabled:opacity-60",
      },
      options.map((opt) =>
        React.createElement("option", { key: opt, value: opt }, opt),
      ),
    );
  }

  if (type === "link") {
    return React.createElement("input", {
      id: fieldId,
      "data-testid": fieldId,
      type: "url",
      value,
      disabled,
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        onChange(field.path, e.target.value),
      onBlur,
      className:
        "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink disabled:opacity-60",
      placeholder: "https://",
    });
  }

  return React.createElement("input", {
    id: fieldId,
    "data-testid": fieldId,
    type: "text",
    value,
    disabled,
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      onChange(field.path, e.target.value),
    onBlur,
    className:
      "mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink disabled:opacity-60",
  });
}
