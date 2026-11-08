import { NextRequest, NextResponse } from "next/server";
import { listDomains, verifyDomain } from "@/modules/publishing";
import { canAccess, findProject } from "@/modules/projects";
import { notFound, requireUser } from "@/modules/auth";

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string; domainId: string }> }
) {
  const params = await props.params;
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id).catch(() => null);
  if (!project || !canAccess(project, auth.user.id, auth.user.role === "admin")) {
    return notFound();
  }

  const owns = (await listDomains(params.id)).some(
    (item) => item.id === params.domainId,
  );
  if (!owns) return notFound("Domain tidak ditemukan.");

  const domain = await verifyDomain(params.domainId).catch(() => null);
  if (!domain) {
    return NextResponse.json(
      { error: { code: "BACKEND_ERROR", message: "Verifikasi DNS gagal." } },
      { status: 502 },
    );
  }
  return NextResponse.json(domain);
}
