import { Badge } from "./badge";
import { statusLabel } from "@/shared/lib/format";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const statusVariant: Record<string, Variant> = {
  DRAFT: "neutral",
  INTAKE: "info",
  COMPREHENDED: "accent",
  TEMPLATE_CHOSEN: "info",
  GENERATING: "warning",
  PREVIEWS: "accent",
  PICKED: "info",
  PAID: "success",
  DEPLOYED: "success",
  ACTIVE: "success",
  PENDING: "warning",
  CONFIRMED: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
  QUEUED: "neutral",
  PROCESSING: "warning",
  READY: "success",
  EXHAUSTED: "warning",
  EXPIRED: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant[status] ?? "neutral"}>
      {statusLabel(status)}
    </Badge>
  );
}
