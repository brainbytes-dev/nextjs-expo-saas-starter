import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better-Auth API Routes
 * Handles authentication endpoints: /api/auth/signin, /api/auth/signup, etc.
 */
export const { POST, GET } = toNextJsHandler(auth);
