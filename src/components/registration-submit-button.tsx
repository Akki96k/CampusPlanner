"use client";

import { useFormStatus } from "react-dom";

export function RegistrationSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
      {pending ? "Submitting registration…" : "Complete registration"}
    </button>
  );
}
