// ============================================================
// NextAuth v5 Configuration
// Phase 2: Dev-mode with credential-less JWT from our NestJS API
// ============================================================
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // ---- Providers ----
  providers: [
    Credentials({
      name: "dev-token",
      credentials: {
        token: { label: "Dev Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        // Dev mode: accept any "dev-*" token
        // Production: validate JWT from NestJS API
        if (
          typeof credentials.token === "string" &&
          credentials.token.startsWith("dev-")
        ) {
          return {
            id: credentials.token.replace("dev-", "") || "dev-user-001",
            email: "dev@longkedin.local",
            name: "Developer",
          };
        }

        // In production, call NestJS /api/rest/auth/me with the token
        // const res = await fetch(`${API_URL}/api/rest/auth/me`, {
        //   headers: { Authorization: `Bearer ${credentials.token}` }
        // });
        // if (!res.ok) return null;
        // return res.json();

        return null;
      },
    }),
  ],

  // ---- Session strategy ----
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // ---- Callbacks ----
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as any).role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  // ---- Pages ----
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ---- Secret ----
  secret: process.env.NEXTAUTH_SECRET,
});
