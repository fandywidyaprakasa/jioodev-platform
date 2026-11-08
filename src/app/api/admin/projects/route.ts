import { NextResponse } from "next/server";
import { listProjects } from "@/modules/projects";
import { requireUser } from "@/modules/auth";

export async function GET() {
  const auth = await requireUser("admin");
  if ("response" in auth) return auth.response;

  const projects = await listProjects("", true).catch(() => []);
  return NextResponse.json(projects);
}
