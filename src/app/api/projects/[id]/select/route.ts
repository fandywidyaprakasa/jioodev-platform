import { NextRequest, NextResponse } from "next/server";
import { mockProjects } from "@/shared/lib/mock-data";
import { badRequest, notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = mockProjects.find((item) => item.id === params.id);
  if (!project) return notFound();

  const body = (await request.json().catch(() => null)) as
    | { variant_id?: string }
    | null;
  if (!body?.variant_id) return badRequest("variant_id wajib diisi.");

  project.status = "PICKED";
  project.updatedAt = new Date().toISOString();
  return NextResponse.json({ status: "PICKED", variant_id: body.variant_id });
}
