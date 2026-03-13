import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import type { Auth } from "better-auth";

// Construct the full auth type from better-auth's exported Auth generic,
// parameterised with the plugins we actually use. No runtime variable needed.
type AuthInstance = Auth<{
  plugins: [ReturnType<typeof nextCookies>, ReturnType<typeof admin>];
  database: { type: "postgres"; url: string };
}>;

let authInstance: AuthInstance | null = null;

try {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  authInstance = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    plugins: [
      nextCookies(),
      admin(),
    ],
    database: {
      type: "postgres",
      url: databaseUrl,
    },
  }) as unknown as AuthInstance;
} catch (error) {
  authInstance = null;
  if (process.env.NODE_ENV === "development") {
    console.warn("Better-Auth initialization failed:", error);
  }
}

export const auth = authInstance as AuthInstance;

export function getAuth() {
  return auth;
}

export type Session = NonNullable<Awaited<ReturnType<AuthInstance["api"]["getSession"]>>>;
