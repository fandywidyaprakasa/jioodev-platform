import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FieldComponent,
  type FriendlyField,
} from "@/modules/workspace/components/inspector-field";

describe("FieldComponent", () => {
  const textField: FriendlyField = {
    path: ["headline"],
    label: "Judul utama",
    value: "Hello",
    type: "text",
  };

  const textareaField: FriendlyField = {
    path: ["body"],
    label: "Isi teks",
    value: "Long text",
    type: "textarea",
  };

  const enumField: FriendlyField = {
    path: ["alignment"],
    label: "Perataan",
    value: "left",
    type: "enum",
    options: ["left", "center", "right"],
  };

  const linkField: FriendlyField = {
    path: ["href"],
    label: "Tautan",
    value: "https://example.com",
    type: "link",
  };

  it("renders text input for type text", () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldComponent, {
        field: textField,
        fieldId: "field-text",
        disabled: false,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
    );
    expect(html).toContain('type="text"');
  });

  it("renders textarea for type textarea", () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldComponent, {
        field: textareaField,
        fieldId: "field-textarea",
        disabled: false,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
    );
    expect(html).toContain("<textarea");
  });

  it("renders select with options for type enum", () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldComponent, {
        field: enumField,
        fieldId: "field-enum",
        disabled: false,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
    );
    expect(html).toContain("<select");
    expect(html).toContain("<option");
    expect(html).toContain("center");
  });

  it("renders URL input for type link", () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldComponent, {
        field: linkField,
        fieldId: "field-link",
        disabled: false,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
    );
    expect(html).toContain('type="url"');
  });

  it("calls onChange with field.path and value", () => {
    const onChange = vi.fn();
    const element = FieldComponent({
      field: textField,
      fieldId: "field-text",
      disabled: false,
      onChange,
      onBlur: vi.fn(),
    });
    const handler = element.props.onChange as any;
    handler({ target: { value: "new value" } });
    expect(onChange).toHaveBeenCalledWith(textField.path, "new value");
  });

  it("disabled state when !can(section.content.edit)", () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldComponent, {
        field: textField,
        fieldId: "field-text",
        disabled: true,
        onChange: vi.fn(),
        onBlur: vi.fn(),
      }),
    );
    expect(html).toContain("disabled");
  });
});
