import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { audit, upsertUser } from "./pocketbase";

const adminEmails = (process.env.ALLOWED_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        const pb: any = await upsertUser({
          email: user.email,
          name: user.name ?? undefined,
        });
        (user as any).pbId = pb.id;
        (user as any).role = adminEmails.includes(user.email.toLowerCase())
          ? "admin"
          : "user";
        return true;
      } catch (e) {
        console.error("[auth] signIn sync failed", e);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).uid = (user as any).pbId;
        (token as any).role = (user as any).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).uid;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      await audit({
        action: "auth.login.success",
        email: user.email ?? "",
        userId: (user as any).pbId,
        meta: { provider: account?.provider ?? "google" },
      });
    },
    async signOut({ token }) {
      await audit({
        action: "auth.logout",
        email: (token as any)?.email ?? "",
        userId: (token as any)?.uid,
      });
    },
  },
};
