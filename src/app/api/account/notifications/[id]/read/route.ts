import { NextRequest, NextResponse } from "next/server";
import { mockNotifications } from "@/shared/lib/mock-data";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const item = mockNotifications.find((entry) => entry.id === params.id);
  if (!item) return notFound();
  item.read = true;
  return NextResponse.json(item);
}
