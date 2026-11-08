import { NextRequest, NextResponse } from "next/server";
import { mockCopy } from "@/shared/lib/mock-data";
import { getProjectCopy, saveProjectCopy } from "@/modules/projects";
import { canAccess, findProject } from "@/modules/projects";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import type { CopyField } from "@/shared/types";

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

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;

  const fields = await getProjectCopy(params.id, mockCopy);
  return NextResponse.json(fields);
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as CopyField[] | null;
  if (!Array.isArray(body)) return badRequest("Body wajib berupa array copy.");
  for (const field of body) {
    if (!field?.key || typeof field.value !== "string") {
      return badRequest("Setiap copy wajib memiliki key dan value.");
    }
  }

  const saved = await saveProjectCopy(params.id, body).catch(() => null);
  if (!saved) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal menyimpan copy." } },
      { status: 502 },
    );
  }
  return NextResponse.json(saved);
}
