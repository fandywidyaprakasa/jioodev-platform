import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, requireActor } from "@/shared/lib/server-auth";
import { canAccess, findProject } from "@/shared/lib/projects-server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }

  const body = (await request.json().catch(() => null)) as
    | { key?: string; code?: string }
    | null;
  const code = body?.key ?? body?.code;
  if (!code) return badRequest("key wajib diisi.");

  return NextResponse.json([
    `Saran JiooDev untuk ${code}: ringkas, konkret, berorientasi manfaat.`,
    `Versi hangat untuk ${code}: ajak pembaca mengambil langkah kecil.`,
    `Versi tegas untuk ${code}: hilangkan keraguan, tunjukkan hasil.`,
  ]);
}
