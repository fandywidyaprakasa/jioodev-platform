import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isSessionExpired } from "@/shared/lib/session-policy";

const GUEST_COOKIE = "jioodev_guest";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const hits = new Map<string, { count: number; reset: number }>();

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const ip = (req as unknown as { ip?: string }).ip;
  return ip || "unknown";
}

function rateLimit(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return null;
  }
  entry.count += 1;
  if (entry.count <= MAX_REQUESTS) return null;

  const retry = Math.ceil((entry.reset - now) / 1000);
  return new NextResponse(
    JSON.stringify({
      error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan." },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retry),
      },
    },
  );
}

function sameOrigin(req: NextRequest, origin: string) {
  try {
    const parsed = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return Boolean(host) && parsed.host === host;
  } catch {
    return false;
  }
}

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {};
  if (origin && sameOrigin(req, origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Vary"] = "Origin";
  }
  return headers;
}

/**
 * Guard.
 * - Mock hanya bila JIOODEV_AUTH_MODE=mock DAN (non-production atau ALLOW_INSECURE_MOCK=1).
 * - Selain itu wajib sesi NextAuth (JWT bertanda tangan).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Mitigasi CVE image optimizer: endpoint tidak dipakai (images.unoptimized).
  if (pathname.startsWith("/_next/image")) {
    return new NextResponse(null, { status: 404 });
  }

  const adminIps = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    adminIps.length &&
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
    !adminIps.includes(clientIp(req))
  ) {
    return new NextResponse("Akses admin dibatasi.", { status: 403 });
  }

  if (pathname.startsWith("/api")) {
    const origin = req.headers.get("origin");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      origin &&
      !sameOrigin(req, origin)
    ) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Origin tidak diizinkan." } },
        { status: 403 },
      );
    }
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(req),
      });
    }
    if (!pathname.startsWith("/api/auth") && !pathname.startsWith("/api/health")) {
      const limited = rateLimit(req);
      if (limited) return limited;
    }
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders(req))) {
      response.headers.set(key, value);
    }
    return response;
  }

  const isProd = process.env.NODE_ENV === "production";
  const allowMock =
    process.env.JIOODEV_AUTH_MODE === "mock" &&
    (!isProd || process.env.JIOODEV_ALLOW_INSECURE_MOCK === "1");
  if (allowMock) return NextResponse.next();

  if (["/login", "/register", "/forgot-password", "/admin/login"].includes(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isGuestPath(pathname)) {
      const response = NextResponse.next();
      if (!req.cookies.get(GUEST_COOKIE)?.value) {
        response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), {
          httpOnly: true,
          sameSite: "lax",
          secure: isProd,
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
      }
      return response;
    }
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && (token as any).role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  // Session policy (Spec 11): admin 8h, remember 30d, default 12h.
  const remember = req.cookies.get("jioodev_remember")?.value === "1";
  const role = (token as any).role as string | undefined;
  const lastActive = Number((token as any).lastActive ?? 0);
  if (
    isSessionExpired({
      lastActive: lastActive || undefined,
      issuedAt: (token as any).iat as number | undefined,
      role,
      remember,
    })
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function isGuestPath(pathname: string) {
  if (pathname === "/app" || pathname === "/app/projects") return true;
  if (pathname === "/app/templates") return true;
  if (pathname === "/app/projects/new") return true;
  if (!pathname.startsWith("/app/projects/")) return false;
  if (/\/(payment|deploy)(\/|$)/.test(pathname)) return false;
  if (/\/account(\/|$)/.test(pathname)) return false;
  return true;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/api/:path*"],
};
