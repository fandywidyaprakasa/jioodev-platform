import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function Empty({ title, description, action }: EmptyProps) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper text-muted">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
