import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyAdminCredentials } from "@/server/services/user.service";

// Admin / Super Admin only. Students never authenticate — they are
// identified solely by a PlacementInvitation token (see
// /docs/ROUTES.md and /docs/DATABASE.md). JWT sessions are used (no
// OAuth provider, no database-session table). A deactivated admin's
// EXISTING session must still lose access before natural JWT expiry —
// but that re-check deliberately does NOT live in the `jwt` callback
// below, which stays a cheap, synchronous JWT decode. `auth()` (and
// therefore this whole callback chain) runs on every `proxy.ts`
// invocation, including every Link viewport/hover prefetch; a DB
// round-trip here made ordinary sidebar navigation visibly flaky
// (prefetch and click requests contending for the same real, pooled
// Postgres connection) without actually adding security, since
// `proxy.ts` only ever gated "is there a session at all," never
// role/isActive. The real re-check lives in `src/lib/actor.ts`
// (`getActorOrThrow`, used by every service-layer call) and the Admin
// layout (`src/app/admin/(dashboard)/layout.tsx`, for a clean
// redirect-to-login at the shell level) — both run once per real
// navigation, never once per prefetch. See /docs/PRODUCT_RULES.md
// "Roles".
const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        return verifyAdminCredentials(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "SUPER_ADMIN";
      }
      return session;
    },
  },
});
