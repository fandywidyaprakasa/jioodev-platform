import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <section
      className={`rounded-lg border border-line bg-surface p-5 shadow-sm ${className}`}
      {...props}
    >
      {title || description || actions ? (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
