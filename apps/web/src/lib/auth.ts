import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { getDb } from "@repo/db";
import * as schema from "@repo/db/schema";
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
    trustedOrigins: (process.env.TRUSTED_ORIGINS || "http://localhost:3003").split(","),
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        generateId: "uuid",
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
