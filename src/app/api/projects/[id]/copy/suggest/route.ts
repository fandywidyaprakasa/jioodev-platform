import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser } from "@/shared/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  if (!body?.code) return badRequest("code wajib diisi.");

  return NextResponse.json([
    `Saran JiooDev untuk ${body.code}: ringkas, konkret, berorientasi manfaat.`,
    `Versi hangat untuk ${body.code}: ajak pembaca mengambil langkah kecil.`,
    `Versi tegas untuk ${body.code}: hilangkan keraguan, tunjukkan hasil.`,
  ]);
}
