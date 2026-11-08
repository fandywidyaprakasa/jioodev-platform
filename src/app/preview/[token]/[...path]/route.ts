import { resolvePreview } from "@/modules/preview";
import { readTemplatePath } from "@/modules/catalog";

const CACHE = "public, max-age=3600";

export async function GET(
  _request: Request,
  props: { params: Promise<{ token: string; path: string[] }> }
) {
  const params = await props.params;
  const context = await resolvePreview(params.token).catch(() => null);
  if (!context) return new Response("Not found", { status: 404 });

  const file = await readTemplatePath(context.template, params.path);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.data, {
    headers: { "Content-Type": file.type, "Cache-Control": CACHE },
  });
}
