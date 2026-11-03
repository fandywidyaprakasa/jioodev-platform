import { readTemplateFile } from "@/shared/lib/template-file";

export async function GET(
  _request: Request,
  { params }: { params: { code: string; path: string[] } },
) {
  const file = await readTemplateFile(params.code, "shared", params.path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.data, {
    headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=3600" },
  });
}
