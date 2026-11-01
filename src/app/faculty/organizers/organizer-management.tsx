"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { manageOrganizerAction, updateOrganizerProfileAction } from "@/backend/actions/organizers";
import type { OrganizerApplication } from "@/backend/lib/supabase/database.types";

const filters = ["all", "pending", "approved", "rejected", "removed"] as const;
type Filter = typeof filters[number];

export function OrganizerManagement({ applications }: { applications: OrganizerApplication[] }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => applications.filter((application) =>
    (filter === "all" || application.status === filter)
      && `${application.display_name ?? ""} ${application.email}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [applications, filter, search]);

  return <>
    <div className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <label className="block text-sm font-medium text-zinc-800">Search by name or email<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizers" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5" /></label>
      <label className="block text-sm font-medium text-zinc-800">Approval status<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5">{filters.map((item) => <option value={item} key={item}>{item === "all" ? "All organizers" : `${item[0].toUpperCase()}${item.slice(1)} organizers`}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600" aria-label="Organizer totals">{filters.slice(1).map((status) => <span key={status} className="rounded-full bg-slate-100 px-3 py-1.5">{status[0].toUpperCase() + status.slice(1)}: {applications.filter((item) => item.status === status).length}</span>)}</div>
    {visible.length === 0 ? <section className="mt-7 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center"><h2 className="text-lg font-semibold text-zinc-900">{applications.length ? "No organizers match" : "No organizer applications yet"}</h2><p className="mt-2 text-sm text-zinc-600">{applications.length ? "Try another search or status filter." : "New organizer applications will appear here."}</p></section> : <ul className="mt-7 grid gap-4">{visible.map((application) => <OrganizerCard application={application} key={application.organizer_id} />)}</ul>}
  </>;
}

function OrganizerCard({ application }: { application: OrganizerApplication }) {
  const [isEditing, setIsEditing] = useState(false);
  const name = application.display_name || application.email.split("@")[0];
  const statusStyle = application.status === "approved" ? "bg-emerald-100 text-emerald-900" : application.status === "pending" ? "bg-amber-100 text-amber-900" : application.status === "rejected" ? "bg-rose-100 text-rose-900" : "bg-slate-200 text-slate-800";
  const canApprove = application.status === "pending";
  const canRestore = application.status === "rejected" || application.status === "removed";
  const canRemove = application.status === "approved";

  return <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-950">{name}</h2>
        <a href={`mailto:${application.email}`} className="mt-1 inline-block break-all text-sm text-indigo-700 underline">{application.email}</a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle}`}>{application.status}</span>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          aria-expanded={isEditing}
          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {isEditing ? "Close edit" : "Edit profile"}
        </button>
      </div>
    </div>

    {isEditing ? (
      <EditProfileForm application={application} onCancel={() => setIsEditing(false)} />
    ) : (
      <>
        <dl className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Registered" value={formatDate(application.submitted_at)} />
          {application.approved_at && <Info label="Approved" value={formatDate(application.approved_at)} />}
          {application.approved_by_name && <Info label="Approved by" value={application.approved_by_name} />}
          {application.decided_at && <Info label="Last decision" value={formatDate(application.decided_at)} />}
          {application.decided_by_name && <Info label="Reviewed by" value={application.decided_by_name} />}
          {application.status === "rejected" && application.rejected_reason && <Info label="Rejection reason" value={application.rejected_reason} />}
          {application.status === "removed" && application.removed_reason && <Info label="Removal reason" value={application.removed_reason} />}
        </dl>
        {(canApprove || canRestore || canRemove) && <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
          {canApprove && <DecisionForm application={application} status="approved" label="Approve organizer" confirm="Approve this organizer? They will receive a password setup link by email." />}
          {canRestore && <DecisionForm application={application} status="approved" label="Restore / approve again" confirm="Restore this organizer's access and notify them by email?" />}
          {canApprove && <ReasonForm application={application} status="rejected" label="Reject application" confirm="Reject this organizer application?" reasonLabel="Rejection reason" />}
          {canRemove && <ReasonForm application={application} status="removed" label="Remove access" confirm="Remove this organizer's access? This takes effect immediately." reasonLabel="Removal reason" />}
        </div>}
      </>
    )}
  </li>;
}

function EditProfileForm({ application, onCancel }: { application: OrganizerApplication; onCancel: () => void }) {
  return (
    <form action={updateOrganizerProfileAction} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Edit Organizer Profile</h3>
          <p className="mt-0.5 text-xs text-slate-500">Update permitted organizer details. Credentials and status cannot be changed here.</p>
        </div>
        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 uppercase tracking-wide">
          Faculty Action
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`display-name-${application.organizer_id}`} className="block text-xs font-semibold text-zinc-700">
            Full name / Display name <span className="text-rose-600">*</span>
          </label>
          <input
            id={`display-name-${application.organizer_id}`}
            name="displayName"
            type="text"
            required
            maxLength={100}
            defaultValue={application.display_name ?? ""}
            placeholder="e.g. Dr. Jane Smith"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <p className="mt-1 text-xs text-zinc-500">1 to 100 characters. Visible on events and directories.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700">
            Login Email (Read-only)
          </label>
          <input
            type="email"
            value={application.email}
            disabled
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed shadow-none"
          />
          <p className="mt-1 text-xs text-zinc-500">Organizer credentials are protected and managed by the account owner.</p>
        </div>
      </div>

      <input type="hidden" name="organizerId" value={application.organizer_id} />

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-indigo-100 pt-3">
        <SubmitButton>Save changes</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DecisionForm({ application, status, label, confirm }: { application: OrganizerApplication; status: "approved"; label: string; confirm: string }) {
  return <form action={manageOrganizerAction} onSubmit={(event) => confirmSubmit(event, confirm)}><input type="hidden" name="organizerId" value={application.organizer_id} /><input type="hidden" name="status" value={status} /><SubmitButton>{label}</SubmitButton></form>;
}

function ReasonForm({ application, status, label, confirm, reasonLabel }: { application: OrganizerApplication; status: "rejected" | "removed"; label: string; confirm: string; reasonLabel: string }) {
  return <form action={manageOrganizerAction} onSubmit={(event) => confirmSubmit(event, confirm)} className="grid w-full gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end">
    <input type="hidden" name="organizerId" value={application.organizer_id} /><input type="hidden" name="status" value={status} />
    <label className="text-xs font-semibold text-zinc-700">{reasonLabel}<textarea name="reason" required maxLength={2000} rows={2} placeholder="Required; up to 2,000 characters" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal" /></label>
    <SubmitButton tone="danger">{label}</SubmitButton>
  </form>;
}

function SubmitButton({ children, tone = "primary" }: { children: string; tone?: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${tone === "danger" ? "bg-rose-700 hover:bg-rose-800" : "bg-indigo-700 hover:bg-indigo-800"}`}>{pending ? "Saving…" : children}</button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="font-medium text-zinc-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-zinc-900">{value}</dd></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function confirmSubmit(event: FormEvent<HTMLFormElement>, message: string) {
  if (!window.confirm(message)) event.preventDefault();
}
