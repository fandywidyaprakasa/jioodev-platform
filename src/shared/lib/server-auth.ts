import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/modules/auth/auth-options";

export interface AuthUser {
  id: string;
  email?: string;
  role: "guest" | "user" | "admin";
}

export async function currentUser(): Promise<AuthUser | null> {
  const mode = process.env.JIOODEV_AUTH_MODE ?? "";
  const mock = mode === "mock" || (!mode && process.env.NODE_ENV !== "production");
  if (mock) {
    return { id: "mock-user", email: "mock@jioo.site", role: "admin" };
  }
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; email?: string | null; role?: string }
    | undefined;
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
    role: user.role === "admin" ? "admin" : "user",
  };
}

export async function requireUser(
  role?: "user" | "admin",
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await currentUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sesi tidak ditemukan." } },
        { status: 401 },
      ),
    };
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
