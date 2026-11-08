import { NextRequest, NextResponse } from "next/server";
import { badRequest, requireActor } from "@/modules/auth";
import {
  createProject,
  listProjects,
  recordGuestSession,
} from "@/modules/projects";
import { getTemplate } from "@/modules/catalog";
import {
  ALL_PRODUCT_TYPES,
  isMvpProductType,
  type ProductType,
} from "@/shared/types";

export async function GET(request: NextRequest) {
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const isGuest = auth.user.role === "guest";
  try {
    const clientLabel = request.nextUrl.searchParams.get("client_label")?.trim();
    const projects = await listProjects(
      isGuest ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
      clientLabel || undefined,
    );
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
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { product_type?: ProductType; template_code?: string }
    | null;
  if (!body?.product_type || !isMvpProductType(body.product_type)) {
    return badRequest("MVP hanya mendukung Landing (LAND).", {
      field: "product_type",
    });
  }

  let templateCode: string | undefined;
  if (typeof body.template_code === "string" && body.template_code.trim()) {
    const template = await getTemplate(
      body.template_code.trim(),
      ALL_PRODUCT_TYPES,
    ).catch(() => null);
    if (!template) {
      return badRequest("Template tidak ditemukan.", {
        field: "template_code",
      });
    }
    if (template.productType !== body.product_type) {
      return badRequest("Template tidak sesuai dengan tipe produk.", {
        field: "template_code",
      });
    }
    templateCode = template.code;
  }

  try {
    const isGuest = auth.user.role === "guest";
    const project = await createProject(
      {
        userId: isGuest ? undefined : auth.user.id,
        guestId: auth.user.guestId,
      },
      body.product_type,
      templateCode,
    );
    if (isGuest && auth.user.guestId) {
      await recordGuestSession(auth.user.guestId, project.id).catch(
        () => undefined,
      );
    }
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("[projects] create failed", e);
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Gagal membuat project." } },
      { status: 502 },
    );
  }
}
