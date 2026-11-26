import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import type { NextAuthConfig } from "next-auth";

// Legacy dev-account email: changing it orphans the existing dev user's projects.
const DEV_EMAIL = "dev@shieldforge.local";

/** True when real GitHub OAuth credentials are configured in .env. */
export const githubConfigured = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
);

/**
 * The dev-credentials provider grants a session WITHOUT checking any credential,
 * so it must never be reachable in production. It is therefore restricted to
 * non-production environments only.
 *
 * `isAuthMisconfigured` reports the resulting dead end: a production deployment
 * with no GitHub OAuth has no usable sign-in provider at all. `src/proxy.ts`
 * turns that into a 503 with an actionable message instead of silently serving
 * an application nobody can log in to.
 */
export const devProviderEnabled = process.env.NODE_ENV !== "production";

export const isAuthMisconfigured =
  process.env.NODE_ENV === "production" && !githubConfigured;

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(githubConfigured
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            authorization: {
              params: { scope: "read:user user:email repo" },
            },
            profile(profile) {
              return {
                id: String(profile.id),
                name: profile.name ?? profile.login,
                email: profile.email,
                image: profile.avatar_url,
                username: profile.login,
              };
            },
          }),
        ]
      : []),
    ...(devProviderEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Dev Account",
            credentials: {},
            async authorize() {
              // Local/dev fallback so the app is usable without GitHub OAuth keys.
              let user = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email: DEV_EMAIL,
                    name: "Dev User",
                    username: "dev",
                    preferredLanguage: "en",
                  },
                });
              }
              await writeAudit(user.id, "LOGIN", { provider: "dev" });
              return {
                id: user.id,
                email: user.email ?? undefined,
                name: user.name ?? undefined,
                image: user.image ?? undefined,
              };
            },
          }),
        ]
      : []),
    // Email/password credentials provider
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        await writeAudit(user.id, "LOGIN", { provider: "credentials" });
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      if (user?.id) token.sub = user.id;
      if (trigger === "signIn" || !token.emailVerified) {
        // Re-validate the user row so deleted accounts can't keep sessions.
        if (token.sub) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { id: true, githubUsername: true },
          });
          if (!dbUser) return null; // invalidate the session
          token.githubUsername = dbUser.githubUsername;
        }
      }
      if (account?.provider === "github" && account.access_token) {
        // Persist the GitHub token encrypted at rest (AES-256-GCM).
        // The raw token is never placed inside the client-visible JWT.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubAccessTokenEncrypted: encryptSecret(account.access_token),
            githubUsername: (profile as { login?: string })?.login,
            githubAvatarUrl: (profile as { avatar_url?: string })?.avatar_url,
            email: user.email ?? null,
          },
        });
        await writeAudit(user.id ?? null, "LOGIN", { provider: "github" });
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.githubUsername === "string") {
        session.user.githubUsername = token.githubUsername;
      }
      return session;
    },
  },
  pages: {
    signIn: "/en/login",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
