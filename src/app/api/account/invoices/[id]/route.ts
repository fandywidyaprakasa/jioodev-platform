import { NextRequest, NextResponse } from "next/server";
import { getPaymentForUser } from "@/modules/payments";
import { notFound, requireUser } from "@/modules/auth";
import { rupiah } from "@/shared/lib/format";

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const payment = await getPaymentForUser(
    params.id,
    auth.user.id,
    auth.user.role === "admin",
  ).catch(() => null);
  if (!payment) return notFound("Invoice tidak ditemukan.");

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Invoice ${payment.invoiceNo ?? payment.id}</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:10px;border-bottom:1px solid #e5e5e5;text-align:left}h1{font-size:24px}.muted{color:#666}</style>
</head><body>
<h1>Invoice JiooDev</h1>
<p class="muted">${payment.invoiceNo ?? payment.id} · ${new Date(payment.createdAt).toLocaleString("id-ID")}</p>
<table><tr><th>Project</th><td>${payment.projectId}</td></tr>
<tr><th>Nominal</th><td>${rupiah(payment.amount)}</td></tr>
<tr><th>Status</th><td>${payment.status}</td></tr>
<tr><th>Kedaluwarsa</th><td>${new Date(payment.expiresAt).toLocaleString("id-ID")}</td></tr></table>
<p class="muted" style="margin-top:32px">Dokumen ini dihasilkan otomatis oleh JiooDev.</p>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${payment.invoiceNo ?? payment.id}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
