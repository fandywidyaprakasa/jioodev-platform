import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Guard.
 * - Mock hanya bila JSDEV_AUTH_MODE=mock DAN (non-production atau ALLOW_INSECURE_MOCK=1).
 * - Selain itu wajib sesi NextAuth (JWT bertanda tangan).
 */
export async function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const allowMock =
    process.env.JSDEV_AUTH_MODE === "mock" &&
    (!isProd || process.env.JSDEV_ALLOW_INSECURE_MOCK === "1");
  if (allowMock) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
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

  // "Remember me" logical expiry (cookie jsdev_remember=0 → 12 jam)
  const remember = req.cookies.get("jsdev_remember")?.value;
  if (remember === "0") {
    const iat = (token as any).iat as number | undefined;
    if (iat && Date.now() / 1000 - iat > 12 * 3600) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("expired", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
