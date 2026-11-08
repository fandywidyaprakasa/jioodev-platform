export const PREVIEW_IFRAME_SANDBOX = "allow-scripts allow-forms";

export const PREVIEW_IFRAME_SANDBOX_PREFIXES = [
  "/preview/",
  "/template-preview/",
  "/composition-preview/",
  "/variant-preview/",
];

export function shouldSandboxPreviewIframe(src: string): boolean {
  return PREVIEW_IFRAME_SANDBOX_PREFIXES.some((prefix) => src.startsWith(prefix));
}
