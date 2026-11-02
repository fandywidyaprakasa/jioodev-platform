import { NextRequest, NextResponse } from "next/server";
import { mockJob } from "@/shared/lib/mock-data";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; jobId: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({ ...mockJob, id: params.jobId });
}
