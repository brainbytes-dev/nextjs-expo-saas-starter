import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client - Optional
 * Only initialize if SUPABASE_URL and SUPABASE_ANON_KEY are set
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

/**
 * Helper to get authenticated user from session
 */
export async function getAuthUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper to get current session
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Example: Fetch data from a table
 * const { data, error } = await supabase
 *   .from('your_table')
 *   .select('*');
 */
