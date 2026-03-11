import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [nextCookies()],
  database: {
    type: "sqlite", // or postgres, mysql, etc.
    // For development, using SQLite
    // For production, consider using a proper database
  },
});

export type Session = typeof auth.$Infer.Session;
