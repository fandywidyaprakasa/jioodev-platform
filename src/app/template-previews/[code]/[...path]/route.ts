import { readTemplatePath } from "@/modules/catalog";

const CACHE = "public, max-age=31536000, immutable";

export async function GET(
  _request: Request,
  props: { params: Promise<{ code: string; path: string[] }> }
) {
  const params = await props.params;
  const file = await readTemplatePath(params.code, ["previews", ...params.path]);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.data, {
    headers: { "Content-Type": file.type, "Cache-Control": CACHE },
  });
}
