import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authOptions } from "@/modules/auth/auth-options";
import { audit } from "@/modules/auth/pocketbase";
import { claimGuestProjects } from "@/shared/lib/projects-server";
import { GUEST_COOKIE } from "@/shared/lib/server-auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  const userId = sessionUser?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sesi tidak ditemukan." } },
      { status: 401 },
    );
  }

  const guestId = cookies().get(GUEST_COOKIE)?.value;
  let claimed = 0;
  if (guestId) {
    claimed = await claimGuestProjects(guestId, userId).catch(() => 0);
  }
  await audit({
    action: "auth.guest.claim",
    email: sessionUser?.email,
    userId,
    meta: { claimed },
  });

  const response = NextResponse.json({ ok: true, claimed });
  response.cookies.set(GUEST_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
