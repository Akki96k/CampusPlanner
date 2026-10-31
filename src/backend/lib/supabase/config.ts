const urlPlaceholder = "https://your-project.supabase.co";
const keyPlaceholder = "your-supabase-publishable-key";

export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  return Boolean(
    url &&
      publishableKey &&
      url !== urlPlaceholder &&
      publishableKey !== keyPlaceholder,
  );
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || !hasSupabaseConfig()) {
    throw new Error(
      "Supabase is not configured. Add your project URL and publishable key to .env.local.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS (or localhost for development).");
  }

  return { url, publishableKey };
}
