import { NextResponse } from "next/server";
import { requireUser } from "@/modules/auth";
import { backfillProjectSites } from "@/modules/projects";

export async function POST() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await backfillProjectSites());
  } catch {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal membaca projects." } },
      { status: 502 },
    );
  }
}
