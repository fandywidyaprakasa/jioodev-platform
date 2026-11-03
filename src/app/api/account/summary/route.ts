import { NextResponse } from "next/server";
import {
  getSubscription,
  listInvoices,
} from "@/shared/lib/account-server";
import { listProjects } from "@/shared/lib/projects-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const [projects, subscription, invoices] = await Promise.all([
    listProjects(auth.user.id, auth.user.role === "admin").catch(() => []),
    getSubscription(auth.user.id).catch(() => null),
    listInvoices(auth.user.id).catch(() => []),
  ]);

  return NextResponse.json({
    projects: projects.length,
    subscription:
      subscription ?? {
        plan: "Belum berlangganan",
        status: "EXPIRED",
        quotaUsed: 0,
        quotaTotal: 0,
        renewAt: new Date().toISOString(),
      },
    pendingInvoices: invoices.filter((item) => item.status === "PENDING").length,
  });
}
