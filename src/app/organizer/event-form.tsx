"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createEventAction } from "@/backend/actions/organizer";
import { initialEventFormState } from "@/backend/lib/events/action-state";
import type { CampusEvent } from "@/backend/lib/supabase/database.types";

const inputClassName = "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200";

function setLocalDate(name: string, instant: string) {
  const input = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!input) return;
  const date = new Date(instant);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  input.value = date.toISOString().slice(0, 16);
}

export function EventForm({ event }: { event?: CampusEvent }) {
  const [state, formAction, pending] = useActionState(createEventAction, initialEventFormState);
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (!event) return;
    setLocalDate("startsAtLocal", event.starts_at);
    setLocalDate("endsAtLocal", event.ends_at);
    if (event.registration_deadline) setLocalDate("registrationDeadlineLocal", event.registration_deadline);
  }, [event]);

  function convertLocalTimes(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    for (const field of ["startsAt", "endsAt", "registrationDeadline"]) {
      const localInput = form.elements.namedItem(`${field}Local`);
      const instantInput = form.elements.namedItem(field);
      if (!(localInput instanceof HTMLInputElement) || !(instantInput instanceof HTMLInputElement)) continue;

      const localValue = localInput.value;
      if (!localValue) {
        instantInput.value = "";
        continue;
      }

      const milliseconds = new Date(localValue).getTime();
      instantInput.value = Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : "";
    }
  }

  return (
    <form action={formAction} onSubmit={convertLocalTimes} className="grid gap-5">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <div>
        <label htmlFor="title" className="text-sm font-medium text-zinc-800">Event title</label>
        <input id="title" name="title" required maxLength={160} defaultValue={event?.title} className={inputClassName} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="text-sm font-medium text-zinc-800">Category</label>
          <input id="category" name="category" required maxLength={60} placeholder="Workshop, sports, music…" defaultValue={event?.category} className={inputClassName} />
        </div>
        <div>
          <label htmlFor="venue" className="text-sm font-medium text-zinc-800">Venue</label>
          <input id="venue" name="venue" required maxLength={200} defaultValue={event?.venue} className={inputClassName} />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="text-sm font-medium text-zinc-800">Description</label>
        <textarea id="description" name="description" required maxLength={10000} rows={4} defaultValue={event?.description} className={inputClassName} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAtLocal" className="text-sm font-medium text-zinc-800">Starts</label>
          <input id="startsAtLocal" name="startsAtLocal" type="datetime-local" required className={inputClassName} />
          <input name="startsAt" type="hidden" />
        </div>
        <div>
          <label htmlFor="endsAtLocal" className="text-sm font-medium text-zinc-800">Ends</label>
          <input id="endsAtLocal" name="endsAtLocal" type="datetime-local" required className={inputClassName} />
          <input name="endsAt" type="hidden" />
        </div>
      </div>
      <p className="-mt-3 text-xs text-zinc-500">Event times use your local time zone{timeZone ? ` (${timeZone})` : ""}.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="registrationDeadlineLocal" className="text-sm font-medium text-zinc-800">Registration deadline <span className="font-normal text-zinc-500">(optional)</span></label>
          <input id="registrationDeadlineLocal" name="registrationDeadlineLocal" type="datetime-local" className={inputClassName} />
          <input name="registrationDeadline" type="hidden" />
        </div>
        <div>
          <label htmlFor="capacity" className="text-sm font-medium text-zinc-800">Capacity <span className="font-normal text-zinc-500">(optional)</span></label>
          <input id="capacity" name="capacity" type="number" min={1} max={100000} step={1} defaultValue={event?.capacity ?? ""} className={inputClassName} />
        </div>
      </div>
      {state.message && (
        <p className={`rounded-lg p-3 text-sm ${state.status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role={state.status === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (event ? "Updating draft…" : "Saving draft…") : (event ? "Update draft" : "Save draft")}
      </button>
      {event && <a href="/organizer" className="w-fit text-sm font-semibold text-slate-600 hover:text-indigo-700">Cancel editing</a>}
    </form>
  );
}
