import { NextRequest, NextResponse } from "next/server";
import { mockSections } from "@/shared/lib/mock-data";
import {
  ensureHomePage,
  getProjectSections,
  listProjectPages,
  normalizeSections,
  saveProjectSections,
  canAccess,
  findProject,
} from "@/modules/projects";
import { badRequest, notFound, requireActor } from "@/modules/auth";
import { parseSections, validateSections } from "@/modules/sections";
import { isWorkspaceOperationSupported } from "@/modules/workspace";

interface SectionsBody {
  sections?: unknown;
  pageId?: unknown;
  page?: unknown;
}

function pageIdFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const record = body as SectionsBody;
  if (typeof record.pageId === "string" && record.pageId.trim()) {
    return record.pageId.trim();
  }
  if (typeof record.page === "string" && record.page.trim()) {
    return record.page.trim();
  }
  return undefined;
}

function sectionsFromBody(body: unknown): unknown {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Array.isArray((body as SectionsBody).sections)
  ) {
    return (body as SectionsBody).sections;
  }
  return body;
}

function saveFailure(errors: string[]) {
  return badRequest(errors[0] ?? "Gagal menyimpan section.", { errors });
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const project = await findProject(params.id).catch(() => null);
  if (
    project &&
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }
  if (!project && auth.user.role !== "admin") return notFound();

  const pageId =
    _request.nextUrl?.searchParams?.get("pageId") ??
    _request.nextUrl?.searchParams?.get("page") ??
    undefined;
  const page = pageId
    ? (await listProjectPages(params.id).catch(() => [])).find(
        (item) => item.id === pageId,
      )
    : null;
  const sections = await getProjectSections(
    params.id,
    mockSections,
    page?.id,
    { includeUnassigned: Boolean(page?.is_home) },
  ).catch(() => mockSections);
  return NextResponse.json(sections);
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireActor();
  if ("response" in auth) return auth.response;
  const project = await findProject(params.id).catch(() => null);
  if (
    project &&
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }
  if (!project && auth.user.role !== "admin") return notFound();

  if (!isWorkspaceOperationSupported(project, "section.content.edit")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_OPERATION", message: "Operasi section.content.edit tidak didukung oleh adapter terpasang." } },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseSections(sectionsFromBody(body));
  if (!parsed.sections) {
    return badRequest(parsed.error);
  }

  const projectState =
    project?.active_sections && typeof project.active_sections === "object" && !Array.isArray(project.active_sections)
      ? (project.active_sections as { theme_id?: string; tier?: "BASIC" | "PRO" | "AGENCY" })
      : {};
  const errors = await validateSections(parsed.sections, {
    themeId: projectState.theme_id,
    tier: projectState.tier,
  });
  if (errors.length) {
    return badRequest(errors[0], { errors });
  }

  const normalized = normalizeSections(parsed.sections);
  const explicitPageId =
    request.nextUrl?.searchParams?.get("pageId") ??
    request.nextUrl?.searchParams?.get("page") ??
    pageIdFromBody(body) ??
    undefined;

  if (explicitPageId) {
    if (!project) return notFound();
    const pages = await listProjectPages(params.id).catch(() => []);
    const page = pages.find((item) => item.id === explicitPageId);
    if (!page) {
      return badRequest(
        `Halaman "${explicitPageId}" bukan milik project ini.`,
        { pageId: explicitPageId, errors: ["pageId tidak valid untuk project ini."] },
      );
    }
    if (page.is_home) {
      await ensureHomePage(params.id).catch(() => null);
    }
    const saved = await saveProjectSections(params.id, normalized, page.id).catch(
      (error: unknown) => ({
        ok: false as const,
        errors: [error instanceof Error ? error.message : "Gagal menyimpan section."],
      }),
    );
    if (!saved.ok) return saveFailure(saved.errors);
    return NextResponse.json(saved.sections);
  }

  const saved = await saveProjectSections(params.id, normalized).catch(
    (error: unknown) => ({
      ok: false as const,
      errors: [error instanceof Error ? error.message : "Gagal menyimpan section."],
    }),
  );
  if (!saved.ok) return saveFailure(saved.errors);
  return NextResponse.json(saved.sections);
}
