"use client";

import { useState, useEffect } from "react";
import { DEMO_SESSION } from "./data";

const DEMO_STORAGE_KEY = "demo-session";
const DEMO_SIGNED_OUT_KEY = "demo-signed-out";

function getDemoSession() {
  if (typeof window === "undefined") return DEMO_SESSION; // SSR: always return session
  try {
    // Respect explicit sign-out
    if (localStorage.getItem(DEMO_SIGNED_OUT_KEY) === "true") return null;
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    // Default to DEMO_SESSION on first visit — no login required
    return stored ? JSON.parse(stored) : DEMO_SESSION;
  } catch {
    return DEMO_SESSION;
  }
}

function setDemoSession(session: typeof DEMO_SESSION | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.removeItem(DEMO_SIGNED_OUT_KEY);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.setItem(DEMO_SIGNED_OUT_KEY, "true");
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }
  // Dispatch storage event so other tabs/hooks pick it up
  window.dispatchEvent(new Event("demo-session-change"));
}

export function useSession() {
  const [session, setSession] = useState<typeof DEMO_SESSION | null>(() => getDemoSession());
  const [isPending] = useState(false);

  useEffect(() => {
    const onChange = () => setSession(getDemoSession());
    window.addEventListener("demo-session-change", onChange);
    return () => window.removeEventListener("demo-session-change", onChange);
  }, []);

  return {
    data: session,
    isPending,
    error: null,
  };
}

export const signIn = {
  email: async (
    _credentials: { email: string; password: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    setDemoSession(DEMO_SESSION);
    callbacks?.onSuccess?.();
    return { data: DEMO_SESSION, error: null };
  },
};

export const signUp = {
  email: async (
    _credentials: { email: string; password: string; name: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { message: string } }) => void },
  ) => {
    setDemoSession(DEMO_SESSION);
    callbacks?.onSuccess?.();
    return { data: DEMO_SESSION, error: null };
  },
};

export async function signOut() {
  setDemoSession(null); // sets DEMO_SIGNED_OUT_KEY so next visit starts signed out
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
