import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/backend/lib/supabase/database.types";

/**
 * Creates a server-side Supabase client using the SERVICE ROLE key.
 * IMPORTANT: This client runs with administrative privileges, bypassing RLS.
 * MUST NEVER be called or exposed to client-side code.
 * Used strictly within faculty-only server actions to provision or manage auth users.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

