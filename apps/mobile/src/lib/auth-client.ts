/**
 * Auth Client for React Native / Expo
 * Uses Better-Auth API via HTTP + local session store
 */

import * as Sentry from "@sentry/react-native";
import {
  setSession,
  getSession,
  useSession,
  type Session,
} from "./session-store";

export { useSession } from "./session-store";

const API_URL = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";

async function authFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }

  return res.json();
}

export async function signIn(email: string, password: string) {
  try {
    const result = await authFetch<{ user: Session["user"]; token: string }>(
      "/api/auth/sign-in/email",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    await setSession({ user: result.user, token: result.token });
    return result;
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "sign_in" } });
    throw error;
  }
}

export async function signUp(
  email: string,
  password: string,
  name?: string
) {
  try {
    const result = await authFetch<{ user: Session["user"]; token: string }>(
      "/api/auth/sign-up/email",
      {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }
    );

    await setSession({ user: result.user, token: result.token });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(name || "", email).catch(() => {});

    return result;
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "sign_up" } });
    throw error;
  }
}

export async function forgotPassword(email: string) {
  try {
    await authFetch<{ success: boolean }>("/api/auth/forget-password", {
      method: "POST",
      body: JSON.stringify({ email, redirectTo: `${API_URL}/reset-password` }),
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "forgot_password" } });
    throw error;
  }
}

export async function signOut() {
  try {
    await authFetch("/api/auth/sign-out", { method: "POST" });
  } catch {
    // Best-effort server logout
  }
  await setSession(null);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

async function sendWelcomeEmail(name: string, email: string) {
  try {
    await fetch(`${API_URL}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "send_welcome_email" } });
  }
}
