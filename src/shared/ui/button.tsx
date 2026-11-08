import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent border-transparent hover:bg-accent-strong disabled:hover:bg-accent",
  secondary:
    "bg-surface text-ink border-line hover:border-ink/40 disabled:hover:border-line",
  ghost:
    "bg-transparent text-ink border-transparent hover:bg-accent-soft disabled:hover:bg-transparent",
  danger:
    "bg-danger text-on-accent border-transparent hover:brightness-90 disabled:hover:brightness-100",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 min-h-11 px-3 text-xs md:min-h-0 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  md: "h-9 min-h-11 px-4 text-sm md:min-h-0 after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
  lg: "h-10 min-h-11 px-5 text-sm md:min-h-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`relative inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
