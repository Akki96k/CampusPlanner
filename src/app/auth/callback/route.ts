import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedPath = requestUrl.searchParams.get("next");
  const nextPath = isSafeInternalPath(requestedPath) ? requestedPath : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}

function isSafeInternalPath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}
