import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireUser } from "@/shared/lib/server-auth";
import { createProject, listProjects } from "@/shared/lib/projects-server";
import type { ProductType } from "@/shared/types";

const PRODUCT_TYPES: ProductType[] = ["LAND", "WEB", "COMM"];

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const projects = await listProjects(auth.user.id, auth.user.role === "admin");
    return NextResponse.json(projects);
  } catch (e) {
    console.error("[projects] list failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal memuat project." } },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { product_type?: ProductType }
    | null;
  if (!body?.product_type || !PRODUCT_TYPES.includes(body.product_type)) {
    return badRequest("product_type wajib LAND, WEB, atau COMM.", {
      field: "product_type",
    });
  }

  try {
    const project = await createProject(auth.user.id, body.product_type);
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("[projects] create failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal membuat project." } },
      { status: 502 },
    );
  }
}
