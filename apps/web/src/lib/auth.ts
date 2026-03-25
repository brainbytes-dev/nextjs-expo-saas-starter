import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { getDb } from "@repo/db";
import * as schema from "@repo/db/schema";
import { sendResetPasswordEmail } from "@/lib/email";
import type { Auth } from "better-auth";

type AuthInstance = Auth<{
  plugins: [ReturnType<typeof nextCookies>, ReturnType<typeof admin>, ReturnType<typeof bearer>];
  database: ReturnType<typeof drizzleAdapter>;
}>;

let authInstance: AuthInstance | null = null;

function initAuth(): AuthInstance {
  if (authInstance) return authInstance;

  authInstance = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3003",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    // Allow requests with missing/null Origin (React Native doesn't send one).
    // TODO: restrict to specific origins in production.
    trustedOrigins: process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(",")
      : process.env.NODE_ENV === "production"
        ? [process.env.BETTER_AUTH_URL || "https://zentory.ch"]
        : ["http://localhost:3003"],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
        await sendResetPasswordEmail(user.email, url);
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        enabled: !!process.env.GOOGLE_CLIENT_ID,
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID || "",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
        enabled: !!process.env.MICROSOFT_CLIENT_ID,
        // Use common tenant to allow any Microsoft account
        tenantId: process.env.MICROSOFT_TENANT_ID || "common",
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID || "",
        clientSecret: process.env.APPLE_CLIENT_SECRET || "",
        enabled: !!process.env.APPLE_CLIENT_ID,
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
      // Share session cookie across all subdomains (app./admin./status.)
      cookiePrefix: "better-auth",
      cookies: {
        session_token: {
          attributes: {
            domain: process.env.NODE_ENV === "production" ? ".zentory.ch" : undefined,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          },
        },
      },
    },
    plugins: [
      nextCookies(),
      admin(),
      bearer(),
    ],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      usePlural: true,
    }),
  }) as unknown as AuthInstance;

  return authInstance;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_, prop) {
    return (initAuth() as Record<string | symbol, unknown>)[prop];
  },
  has(_, prop) {
    return prop in initAuth();
  },
});

export function getAuth() {
  return auth;
}

export type Session = NonNullable<Awaited<ReturnType<AuthInstance["api"]["getSession"]>>>;
