"use client";

import { DEMO_SESSION } from "./data";

// Demo mode: session is always active — no localStorage, no opt-out.
// Sign-out just redirects to home; refreshing restores the demo session.
export function useSession() {
  return {
    data: DEMO_SESSION,
    isPending: false,
    error: null,
  };
}

export const signIn = {
  email: async (
    _credentials: { email: string; password: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    callbacks?.onSuccess?.();
    return { data: DEMO_SESSION, error: null };
  },
};

export const signUp = {
  email: async (
    _credentials: { email: string; password: string; name: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    callbacks?.onSuccess?.();
    return { data: DEMO_SESSION, error: null };
  },
};

export async function signOut() {
  window.location.href = "/";
}

export async function updateProfile(_data: { name?: string }) {
  return { success: true, user: { ...DEMO_SESSION.user, ..._data } };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function changePassword(_data: {
  currentPassword: string;
  newPassword: string;
}) {
  return { success: true, message: "Password updated successfully" };
}

// Provide a stub authClient for code that might reference it
export const authClient = {
  signIn,
  signUp,
  signOut,
  useSession,
};
