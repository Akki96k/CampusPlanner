"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function buildUrlWithoutResult(pathname: string, searchParamsString: string): string {
  const params = new URLSearchParams(searchParamsString);
  params.delete("result");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function OrganizerNotificationBanner({
  result,
  message,
  isSuccess,
}: {
  result?: string;
  message: string;
  isSuccess: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (result !== "profile-updated") return;

    const timer = setTimeout(() => {
      setVisible(false);
      const nextUrl = buildUrlWithoutResult(pathname, searchParams.toString());
      router.replace(nextUrl, { scroll: false });
    }, 3000);

    return () => clearTimeout(timer);
  }, [result, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <p
      role={isSuccess ? "status" : "alert"}
      className={`mt-5 rounded-lg p-4 text-sm transition-opacity duration-300 ${
        isSuccess ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
      }`}
    >
      {message}
    </p>
  );
}
