"use client";

import { useFormStatus } from "react-dom";

type ActionSubmitButtonProps = {
  children: string;
  pendingLabel: string;
  tone?: "primary" | "success" | "danger" | "outline";
};

const tones = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
  success: "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700",
  danger: "border border-rose-300 text-rose-800 hover:bg-rose-50 focus-visible:outline-rose-600",
  outline: "border border-indigo-300 text-indigo-800 hover:bg-indigo-50 focus-visible:outline-indigo-600",
};

export function ActionSubmitButton({ children, pendingLabel, tone = "primary" }: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${tones[tone]}`}>
      {pending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
