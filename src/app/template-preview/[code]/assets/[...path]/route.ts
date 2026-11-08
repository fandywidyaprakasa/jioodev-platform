import { readTemplateFile } from "@/modules/catalog";

export async function GET(
  _request: Request,
  props: { params: Promise<{ code: string; path: string[] }> }
) {
  const params = await props.params;
  const file = await readTemplateFile(params.code, "assets", params.path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.data, {
    headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=3600" },
  });
}
