import { NextRequest, NextResponse } from "next/server";
import { mockJob, mockProjects } from "@/shared/lib/mock-data";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = mockProjects.find((item) => item.id === params.id);
  if (!project) return notFound();

  project.status = "GENERATING";
  project.updatedAt = new Date().toISOString();
  return NextResponse.json(mockJob, { status: 202 });
}
