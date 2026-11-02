import type { Config } from "tailwindcss";
import tokens from "./src/styles/tokens.json";

const fontList = (v: string) => v.split(",").map((s) => s.trim());

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: tokens.color.brand.ink,
        accent: tokens.color.brand.accent,
        "accent-strong": tokens.color.brand.accentStrong,
        "accent-soft": tokens.color.brand.accentSoft,
        paper: tokens.color.neutral.paper,
        surface: tokens.color.neutral.surface,
        line: tokens.color.neutral.line,
        muted: tokens.color.neutral.muted,
        success: tokens.color.semantic.success,
        warning: tokens.color.semantic.warning,
        danger: tokens.color.semantic.danger,
        info: tokens.color.semantic.info,
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
