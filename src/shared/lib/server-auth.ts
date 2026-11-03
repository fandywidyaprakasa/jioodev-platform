import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/modules/auth/auth-options";
import { claimGuestProjects } from "./projects-server";

export const GUEST_COOKIE = "jioodev_guest";

export interface AuthUser {
  id: string;
  email?: string;
  role: "guest" | "user" | "admin";
  guestId?: string;
}

export async function currentUser(): Promise<AuthUser | null> {
  const mode = process.env.JIOODEV_AUTH_MODE ?? "";
  const mock =
    mode === "mock" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.JIOODEV_ALLOW_INSECURE_MOCK === "1");
  if (mock) {
    return { id: "mock-user", email: "mock@jioo.site", role: "admin" };
  }
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; email?: string | null; role?: string }
    | undefined;
  const guestId = cookies().get(GUEST_COOKIE)?.value;

  if (user?.id) {
    if (guestId) {
      await claimGuestProjects(guestId, user.id).catch(() => 0);
    }
    return {
      id: user.id,
      email: user.email ?? undefined,
      role: user.role === "admin" ? "admin" : "user",
    };
  }

  if (guestId) {
    return { id: `guest:${guestId}`, role: "guest", guestId };
  }
  return null;
}

/** Allows guests (for the pre-login project flow). */
export async function requireActor(): Promise<
  { user: AuthUser } | { response: NextResponse }
> {
  const user = await currentUser();
  if (!user) return { response: unauthenticated() };
  return { user };
}

/** Requires a real signed-in user (guests are rejected). */
export async function requireUser(
  role?: "user" | "admin",
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await currentUser();
  if (!user || user.role === "guest") {
    return { response: unauthenticated() };
  }
  if (role === "admin" && user.role !== "admin") {
    return {
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Akses admin diperlukan." } },
        { status: 403 },
      ),
    };
  }
  return { user };
}

function unauthenticated() {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Sesi tidak ditemukan." } },
    { status: 401 },
  );
}

export function notFound(message = "Data tidak ditemukan.") {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message } },
    { status: 404 },
  );
}

export function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { error: { code: "VALIDATION", message, details } },
    { status: 400 },
  );
}
