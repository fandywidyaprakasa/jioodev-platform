import type { Config } from "tailwindcss";
import tokens from "./src/styles/tokens.json";

const fontList = (v: string) => v.split(",").map((s) => s.trim());

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        "accent-strong": "rgb(var(--color-accent-strong-rgb) / <alpha-value>)",
        "accent-soft": "rgb(var(--color-accent-soft-rgb) / <alpha-value>)",
        "on-accent": "rgb(var(--color-on-accent-rgb) / <alpha-value>)",
        paper: "rgb(var(--color-paper-rgb) / <alpha-value>)",
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)",
        line: "rgb(var(--color-line-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        warning: "rgb(var(--color-warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--color-danger-rgb) / <alpha-value>)",
        info: "rgb(var(--color-info-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: fontList(tokens.font.display),
        body: fontList(tokens.font.body),
        mono: fontList(tokens.font.mono),
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
      },
      boxShadow: {
        sm: tokens.shadow.sm,
        md: tokens.shadow.md,
        lg: tokens.shadow.lg,
      },
    },
  },
  plugins: [],
};

export default config;
