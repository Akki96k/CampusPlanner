import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, hasSupabaseConfig } from "@/backend/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        if (cacheHeaders) {
          for (const [name, value] of Object.entries(cacheHeaders)) {
            response.headers.set(name, value);
          }
        }
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}
