export const PREVIEW_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export const PREVIEW_HEADERS = [
  { key: "Content-Security-Policy", value: PREVIEW_CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

export const PREVIEW_HEADER_SOURCES = [
  "/preview/:path*",
  "/template-preview/:path*",
  "/composition-preview/:path*",
  "/variant-preview/:path*",
];

export function previewHeaderRules() {
  return PREVIEW_HEADER_SOURCES.map((source) => ({
    source,
    headers: [...PREVIEW_HEADERS],
  }));
}
