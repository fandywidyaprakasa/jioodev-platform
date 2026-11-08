/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { previewHeaderRules } from "./src/lib/preview-headers.mjs";

const tracingRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';",
  },
];

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: tracingRoot,
  reactStrictMode: true,
  poweredByHeader: false,
  // Mitigasi CVE image optimizer (SVG/AVIF RCE) selama Next 14.
  // Optimasi gambar dimatikan; next/image merender <img> langsung.
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...previewHeaderRules(),
    ];
  },
};

export default nextConfig;
