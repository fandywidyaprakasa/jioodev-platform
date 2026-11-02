import type { HTMLAttributes } from "react";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const variantClass: Record<Variant, string> = {
  neutral: "bg-paper text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-soft",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
