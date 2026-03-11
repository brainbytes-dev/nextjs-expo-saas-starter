import { createAuthClient } from "better-auth/react-native";

/**
 * Better-Auth Client for React Native / Expo
 * Mobile-friendly authentication with persistent storage
 */

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003",
  storageKey: "auth_token",
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  try {
    const session = await authClient.getSession();
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
    return await authClient.getSession();
  } catch {
    return null;
  }
}
