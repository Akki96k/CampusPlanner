import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/backend/lib/supabase/config";
import type { Database } from "@/backend/lib/supabase/database.types";

export async function createClient(options: { rememberMe?: boolean } = {}) {
  const { url, publishableKey } = getSupabaseConfig();
  const cookieStore = await cookies();
  const rememberMe = options.rememberMe ?? cookieStore.get("cc-remember")?.value !== "false";

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            const rememberOptions = !name.startsWith("sb-")
              ? cookieOptions
              : { ...cookieOptions, maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined };
            cookieStore.set(name, value, rememberOptions);
          });
        } catch {
          // Server Components cannot write cookies; the Next.js proxy refreshes sessions.
        }
      },
    },
  });
}
