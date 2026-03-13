/**
 * Better-Auth Client for React Native / Expo
 * Lazy-initialized to avoid module load errors in React Native
 * Falls back to mock client if better-auth/react is not available
 */

import * as Sentry from "@sentry/react-native";

let authClientInstance: any = null;

function getAuthClient() {
  if (authClientInstance) return authClientInstance;

  try {
    const { createAuthClient } = require("better-auth/react");
    authClientInstance = createAuthClient({
      baseURL: process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003",
    });
  } catch (error) {
    console.warn(
      "Better-Auth client not available in React Native context, using mock:",
      error instanceof Error ? error.message : error
    );
    // Return mock client for React Native
    authClientInstance = {
      getSession: async () => null,
      signIn: async () => null,
      signUp: async () => null,
      signOut: async () => null,
    };
  }

  return authClientInstance;
}

export const authClient = getAuthClient();

/**
 * Send welcome email via the web API
 */
async function sendWelcomeEmail(name: string, email: string) {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";
    const response = await fetch(`${apiUrl}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send welcome email: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error sending welcome email:", error);
    Sentry.captureException(error, { tags: { action: "send_welcome_email" } });
    // Don't throw - email failure shouldn't break signup
  }
}

// Export auth methods
export async function signIn(email: string, password: string) {
  try {
    return await getAuthClient().signIn?.({ email, password });
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "sign_in" } });
    throw error;
  }
}

export async function signUp(email: string, password: string, name?: string) {
  try {
    const result = await getAuthClient().signUp?.({ email, password, name });

    // Send welcome email after successful signup
    if (result && email && name) {
      await sendWelcomeEmail(name, email);
    }

    return result;
  } catch (error) {
    Sentry.captureException(error, { tags: { action: "sign_up" } });
    throw error;
  }
}

export async function signOut() {
  return getAuthClient().signOut?.();
}

// Mock useSession hook for React Native (better-auth/react hooks don't work in RN)
export function useSession() {
  return { data: null, status: "unauthenticated" };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    const session = await getAuthClient().getSession?.();
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Get current user session
 */
export async function getCurrentSession() {
  try {
    return await getAuthClient().getSession?.();
  } catch {
    return null;
  }
}
