import { DEMO_MODE } from "@/lib/demo-mode";

// ----- Real implementations -----
// The import of better-auth/react is always present (static import), but the
// client is only instantiated when DEMO_MODE is false.
import { createAuthClient } from "better-auth/react";

const realAuthClient = DEMO_MODE ? null : createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

// ----- Demo stubs for signIn / signUp / signOut -----
// These use dynamic import() so the demo/auth-client module (which has "use client"
// and uses React hooks) is only loaded when actually called.

const demoSignIn = {
  email: async (
    credentials: { email: string; password: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    const mod = await import("@/lib/demo/auth-client");
    return mod.signIn.email(credentials, callbacks);
  },
};

const demoSignUp = {
  email: async (
    credentials: { email: string; password: string; name: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    const mod = await import("@/lib/demo/auth-client");
    return mod.signUp.email(credentials, callbacks);
  },
};

async function demoSignOut() {
  const mod = await import("@/lib/demo/auth-client");
  return mod.signOut();
}

// ----- Exports -----
export const authClient = DEMO_MODE
  ? { signIn: demoSignIn, signUp: demoSignUp, signOut: demoSignOut }
  : realAuthClient!;

export const signIn = DEMO_MODE ? demoSignIn : realAuthClient!.signIn;
export const signUp = DEMO_MODE ? demoSignUp : realAuthClient!.signUp;
export const signOut = DEMO_MODE ? demoSignOut : realAuthClient!.signOut;

// Re-export useSession — consumers import { useSession } from "@/lib/auth-client".
// In demo mode we re-export the hook from the demo module.
// In real mode we re-export from the Better-Auth client.
import { useSession as useDemoSession } from "@/lib/demo/auth-client";

export const useSession = DEMO_MODE
  ? useDemoSession
  : () => realAuthClient!.useSession();

/**
 * Update user profile
 */
export async function updateProfile(data: { name?: string }) {
  if (DEMO_MODE) {
    return { success: true, user: { name: data.name } };
  }
  return await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/update-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  })
    .then((res) => res.json())
}

/**
 * Change user password
 */
export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  if (DEMO_MODE) {
    return { success: true, message: "Password updated successfully" };
  }
  return await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  })
    .then((res) => res.json())
}
