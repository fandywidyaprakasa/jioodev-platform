import { NextRequest, NextResponse } from "next/server";
import { listProjectAssets, uploadProjectAsset } from "@/shared/lib/assets-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { badRequest, notFound, requireActor } from "@/shared/lib/server-auth";

async function authorize(id: string) {
  const auth = await requireActor();
  if ("response" in auth) return { response: auth.response };
  const project = await findProject(id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return { response: notFound() };
  }
  return { project };
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  return NextResponse.json(await listProjectAssets(params.id));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("File wajib diunggah.");
  if (file.size > MAX_BYTES) return badRequest("Ukuran file maksimal 5MB.");
  if (!ACCEPTED.includes(file.type)) {
    return badRequest("Format harus PNG, JPEG, WEBP, atau SVG.");
  }

  const asset = await uploadProjectAsset(params.id, file).catch(() => null);
  if (!asset) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal mengunggah aset." } },
      { status: 502 },
    );
  }
  return NextResponse.json(asset, { status: 201 });
}
