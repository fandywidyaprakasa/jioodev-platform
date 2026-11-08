import { NextRequest } from "next/server";
import {
  canAccess,
  findProject,
  getProjectAssetFile,
} from "@/modules/projects";
import { notFound, requireActor } from "@/modules/auth";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; assetId: string }> }
) {
  const params = await props.params;
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

  const asset = await getProjectAssetFile(params.id, params.assetId);
  if (!asset) return notFound();

  return new Response(asset.stream, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
