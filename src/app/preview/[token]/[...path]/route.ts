import { resolvePreview } from "@/shared/lib/preview-render";
import { readTemplatePath } from "@/shared/lib/template-file";

const CACHE = "public, max-age=3600";

export async function GET(
  _request: Request,
  { params }: { params: { token: string; path: string[] } },
) {
  const context = await resolvePreview(params.token).catch(() => null);
  if (!context) return new Response("Not found", { status: 404 });

  const file = await readTemplatePath(context.template, params.path);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.data, {
    headers: { "Content-Type": file.type, "Cache-Control": CACHE },
  });
}
