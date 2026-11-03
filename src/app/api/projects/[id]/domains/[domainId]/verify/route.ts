import { NextRequest, NextResponse } from "next/server";
import { listDomains, verifyDomain } from "@/shared/lib/deploy-server";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { notFound, requireUser } from "@/shared/lib/server-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; domainId: string } },
) {
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
