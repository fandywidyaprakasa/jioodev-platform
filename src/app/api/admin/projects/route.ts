import { NextResponse } from "next/server";
import { listProjects } from "@/shared/lib/projects-server";
import { requireUser } from "@/shared/lib/server-auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const projects = await listProjects("", true).catch(() => []);
  return NextResponse.json(projects);
}
