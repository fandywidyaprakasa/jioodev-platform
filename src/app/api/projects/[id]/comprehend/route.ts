import { NextRequest, NextResponse } from "next/server";
import { mockComprehend, mockProjects } from "@/shared/lib/mock-data";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = mockProjects.find((item) => item.id === params.id);
  if (!project) return notFound();

  project.status = "COMPREHENDED";
  project.updatedAt = new Date().toISOString();
  return NextResponse.json(mockComprehend);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = mockProjects.find((item) => item.id === params.id);
  if (!project) return notFound();

  const body = (await request.json().catch(() => ({}))) as {
    confirmed?: boolean;
    corrections?: string;
  };
  if (body.confirmed) {
    project.status = "COMPREHENDED";
    project.updatedAt = new Date().toISOString();
  }
  return NextResponse.json({ ok: true, corrections: body.corrections ?? null });
}
