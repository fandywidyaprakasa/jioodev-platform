import { NextRequest, NextResponse } from "next/server";
import { notFound, requireActor, badRequest } from "@/modules/auth";
import { canAccess, findProject } from "@/modules/projects";
import { exportEdgeSite, pushEdgeBundle } from "@/modules/publishing";

async function authorize(id: string) {
  const auth = await requireActor();
  if ("response" in auth) return { response: auth.response };
  const project = await findProject(id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return { response: notFound() };
  }
  return { project };
}

function bundleSummary(bundle: NonNullable<Awaited<ReturnType<typeof exportEdgeSite>>>) {
  const entries = Object.values(bundle.manifest.entries);
  return {
    host: bundle.host,
    slug: bundle.slug,
    version: bundle.version,
    pages: entries.filter((entry) => entry.kind === "page").length,
    assets: entries.filter((entry) => entry.kind === "asset").length,
    skippedAssets: bundle.skippedAssets,
  };
}

async function loadBundle(id: string, body: { host?: string; origin?: string }) {
  const bundle = await exportEdgeSite(id, { host: body.host, origin: body.origin });
  if (!bundle) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: "EDGE_NOT_PUBLISHED",
            message: "Situs belum dipublikasikan, sehingga tidak bisa diekspor ke edge.",
          },
        },
        { status: 409 },
      ),
    };
  }
  return { bundle };
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const host = searchParams.get("host") ?? undefined;
  const loaded = await loadBundle(params.id, { host });
  if ("response" in loaded) return loaded.response;
  return NextResponse.json({ ok: true, bundle: bundleSummary(loaded.bundle) });
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const auth = await authorize(params.id);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { host?: string; origin?: string; push?: boolean }
    | null;
  if (body !== null && typeof body !== "object") return badRequest("Body tidak valid.");
  if (body?.host !== undefined && typeof body.host !== "string") {
    return badRequest("Host tidak valid.");
  }
  if (body?.origin !== undefined && typeof body.origin !== "string") {
    return badRequest("Origin tidak valid.");
  }

  const loaded = await loadBundle(params.id, body ?? {});
  if ("response" in loaded) return loaded.response;

  const result = body?.push
    ? await pushEdgeBundle(loaded.bundle).catch(() => ({
        pushed: false,
        reason: "EDGE_PUSH_ERROR",
        version: loaded.bundle.version,
      }))
    : { pushed: false, reason: "EDGE_PUSH_NOT_REQUESTED", version: loaded.bundle.version };

  return NextResponse.json({ ok: true, bundle: bundleSummary(loaded.bundle), push: result });
}
