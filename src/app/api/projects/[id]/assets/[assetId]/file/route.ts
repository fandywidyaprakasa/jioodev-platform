import { NextRequest } from "next/server";
import { getRecord } from "@/shared/lib/pb-platform";
import { pbAdminToken } from "@/modules/auth/pocketbase";
import { canAccess, findProject } from "@/shared/lib/projects-server";
import { notFound, requireActor } from "@/shared/lib/server-auth";

interface PbAsset {
  id: string;
  project_id?: string;
  file?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; assetId: string } },
) {
  const auth = await requireActor();
  if ("response" in auth) return auth.response;

  const project = await findProject(params.id).catch(() => null);
  if (
    !project ||
    !canAccess(
      project,
      auth.user.role === "guest" ? undefined : auth.user.id,
      auth.user.role === "admin",
      auth.user.guestId,
    )
  ) {
    return notFound();
  }

  const asset = await getRecord<PbAsset>(
    "content_assets",
    params.assetId,
  ).catch(() => null);
  if (!asset || asset.project_id !== params.id || !asset.file) return notFound();

  const base = process.env.POCKETBASE_PLATFORM_URL ?? "";
  const token = await pbAdminToken();
  const response = await fetch(
    `${base}/api/files/content_assets/${asset.id}/${asset.file}`,
    { headers: { Authorization: token }, cache: "no-store" },
  );
  if (!response.ok) return notFound();

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
