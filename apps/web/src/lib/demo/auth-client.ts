"use client";

import { useState, useEffect } from "react";
import { DEMO_SESSION } from "./data";

const DEMO_STORAGE_KEY = "demo-session";

function getDemoSession() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setDemoSession(session: typeof DEMO_SESSION | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session));
  } else {
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
  setDemoSession(null);
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
