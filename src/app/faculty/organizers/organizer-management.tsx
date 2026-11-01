"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  manageOrganizerAction,
  updateOrganizerProfileAction,
  createOrganizerAction,
  deleteOrganizerAction,
} from "@/backend/actions/organizers";
import type { OrganizerApplication } from "@/backend/lib/supabase/database.types";

const filterOptions = [
  { id: "all", label: "All organizers" },
  { id: "approved", label: "Active" },
  { id: "pending", label: "Pending approval" },
  { id: "removed", label: "Deactivated" },
  { id: "rejected", label: "Rejected" },
] as const;

type FilterKey = (typeof filterOptions)[number]["id"];

export function OrganizerManagement({ applications }: { applications: OrganizerApplication[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const visible = useMemo(
    () =>
      applications.filter((application) => {
        const matchesFilter = filter === "all" || application.status === filter;
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          `${application.display_name ?? ""} ${application.email} ${application.status}`
            .toLowerCase()
            .includes(query);
        return matchesFilter && matchesSearch;
      }),
    [applications, filter, search],
  );

  const counts = useMemo(
    () => ({
      all: applications.length,
      approved: applications.filter((item) => item.status === "approved").length,
      pending: applications.filter((item) => item.status === "pending").length,
      removed: applications.filter((item) => item.status === "removed").length,
      rejected: applications.filter((item) => item.status === "rejected").length,
    }),
    [applications],
  );

  return (
    <>
      {/* Top action and filter bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            aria-expanded={showAddForm}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>{showAddForm ? "Close Add Form" : "Add New Organizer"}</span>
          </button>
        </div>
      </div>

      {/* Add New Organizer Collapsible Form */}
      {showAddForm && (
        <section aria-label="Add new organizer account" className="mt-5 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Add New Organizer Account</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create an authenticated organizer account securely through the server-side Admin API. The organizer role is assigned automatically.
            </p>
          </div>
          <form action={createOrganizerAction} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-organizer-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Full Name / Display Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-organizer-name"
                  name="displayName"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Dr. Alex Morgan"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <p className="mt-1 text-xs text-slate-500">1 to 100 characters.</p>
              </div>

              <div>
                <label htmlFor="new-organizer-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Login Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-organizer-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  placeholder="organizer@university.edu"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <p className="mt-1 text-xs text-slate-500">Used by the organizer to sign in.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-organizer-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Initial Password <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-organizer-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="Minimum 8 characters"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Initial Account Status
                </label>
                <div className="mt-2.5 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="approved"
                      defaultChecked
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">Active (Pre-approved)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="pending"
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Pending approval</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-500">Active allows immediate organizer dashboard access.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <SubmitButton>Create Organizer Account</SubmitButton>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filters and search controls */}
      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <label className="block text-sm font-medium text-zinc-800">
          Search by name, email, or status
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organizers..."
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-800">
          Filter by account status
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterKey)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            {filterOptions.map((opt) => (
              <option value={opt.id} key={opt.id}>
                {opt.label} ({counts[opt.id]})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Quick status tabs / counts */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Organizer count totals">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 transition ${
            filter === "all" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setFilter("approved")}
          className={`rounded-full px-3 py-1.5 transition ${
            filter === "approved" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          Active ({counts.approved})
        </button>
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`rounded-full px-3 py-1.5 transition ${
            filter === "pending" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
          }`}
        >
          Pending ({counts.pending})
        </button>
        <button
          type="button"
          onClick={() => setFilter("removed")}
          className={`rounded-full px-3 py-1.5 transition ${
            filter === "removed" ? "bg-slate-700 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Deactivated ({counts.removed})
        </button>
        <button
          type="button"
          onClick={() => setFilter("rejected")}
          className={`rounded-full px-3 py-1.5 transition ${
            filter === "rejected" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
          }`}
        >
          Rejected ({counts.rejected})
        </button>
      </div>

      {/* Organizer list rendering */}
      {visible.length === 0 ? (
        <section className="mt-7 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            {applications.length ? "No matching organizers found" : "No organizer accounts registered"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {applications.length
              ? "Try another search term or reset your status filter."
              : "Use the 'Add New Organizer' button above to create the first organizer account."}
          </p>
          {applications.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
              className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Reset search & filters
            </button>
          )}
        </section>
      ) : (
        <ul className="mt-7 grid gap-4">
          {visible.map((application) => (
            <OrganizerCard application={application} key={application.organizer_id} />
          ))}
        </ul>
      )}
    </>
  );
}

function OrganizerCard({ application }: { application: OrganizerApplication }) {
  const [mode, setMode] = useState<"view" | "edit" | "deactivate" | "delete">("view");
  const name = application.display_name || application.email.split("@")[0];

  const statusBadge =
    application.status === "approved" ? (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
        Active
      </span>
    ) : application.status === "pending" ? (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        Pending approval
      </span>
    ) : application.status === "removed" ? (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800">
        Deactivated
      </span>
    ) : (
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
        Rejected
      </span>
    );

  const canApprove = application.status === "pending";
  const canReactivate = application.status === "removed" || application.status === "rejected";
  const canDeactivate = application.status === "approved";
  const canDelete = application.status === "removed" || application.status === "rejected";

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">{name}</h2>
          <a
            href={`mailto:${application.email}`}
            className="mt-1 inline-block break-all text-sm text-indigo-700 hover:text-indigo-900 underline"
          >
            {application.email}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            aria-expanded={mode === "edit"}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50"
          >
            {mode === "edit" ? "Close edit" : "Edit profile"}
          </button>
        </div>
      </div>

      {mode === "edit" && (
        <EditProfileForm application={application} onCancel={() => setMode("view")} />
      )}

      {mode === "deactivate" && (
        <DeactivateForm application={application} onCancel={() => setMode("view")} />
      )}

      {mode === "delete" && (
        <DeleteForm application={application} onCancel={() => setMode("view")} />
      )}

      {mode === "view" && (
        <>
          <dl className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Registered" value={formatDate(application.submitted_at)} />
            {application.approved_at && <Info label="Approved" value={formatDate(application.approved_at)} />}
            {application.approved_by_name && <Info label="Approved by" value={application.approved_by_name} />}
            {application.decided_at && <Info label="Last decision" value={formatDate(application.decided_at)} />}
            {application.decided_by_name && <Info label="Reviewed by" value={application.decided_by_name} />}
            {application.status === "rejected" && application.rejected_reason && (
              <Info label="Rejection reason" value={application.rejected_reason} />
            )}
            {application.status === "removed" && application.removed_reason && (
              <Info label="Deactivation reason" value={application.removed_reason} />
            )}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
            {canApprove && (
              <DecisionForm
                application={application}
                status="approved"
                label="Approve organizer"
                confirm="Approve this organizer? They will be granted full access to organizer tools."
              />
            )}
            {canReactivate && (
              <DecisionForm
                application={application}
                status="approved"
                label="Reactivate organizer"
                confirm="Reactivate this organizer? Their access to organizer tools will be restored."
              />
            )}
            {canApprove && (
              <ReasonForm
                application={application}
                status="rejected"
                label="Reject application"
                confirm="Reject this organizer application?"
                reasonLabel="Rejection reason"
              />
            )}
            {canDeactivate && (
              <button
                type="button"
                onClick={() => setMode("deactivate")}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-900 shadow-xs hover:bg-amber-100 transition"
              >
                Deactivate organizer
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => setMode("delete")}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition ml-auto"
              >
                Permanently delete...
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

function EditProfileForm({
  application,
  onCancel,
}: {
  application: OrganizerApplication;
  onCancel: () => void;
}) {
  return (
    <form action={updateOrganizerProfileAction} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Edit Organizer Profile</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Update permitted organizer details. Historical events and authorization status remain intact.
          </p>
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
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <p className="mt-1 text-xs text-zinc-500">1 to 100 characters. Visible on events and directories.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700">Login Email (Read-only)</label>
          <input
            type="email"
            value={application.email}
            disabled
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed shadow-none"
          />
          <p className="mt-1 text-xs text-zinc-500">Email addresses are tied to Supabase authentication credentials.</p>
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

function DeactivateForm({
  application,
  onCancel,
}: {
  application: OrganizerApplication;
  onCancel: () => void;
}) {
  return (
    <form
      action={manageOrganizerAction}
      onSubmit={(event) =>
        confirmSubmit(
          event,
          "Deactivate this organizer? Their access to organizer tools will be revoked immediately while preserving all their event history and registrations.",
        )
      }
      className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5"
    >
      <div className="border-b border-amber-200/70 pb-3">
        <h3 className="text-sm font-semibold text-amber-950">Deactivate Organizer Access</h3>
        <p className="mt-0.5 text-xs text-amber-800">
          Deactivation safely revokes organizer permissions. Historical events, attendee lists, and verified attendance are <strong>strictly preserved</strong>.
        </p>
      </div>

      <input type="hidden" name="organizerId" value={application.organizer_id} />
      <input type="hidden" name="status" value="removed" />

      <div className="mt-4">
        <label htmlFor={`deactivate-reason-${application.organizer_id}`} className="block text-xs font-semibold text-amber-950">
          Deactivation reason <span className="text-rose-600">*</span>
        </label>
        <textarea
          id={`deactivate-reason-${application.organizer_id}`}
          name="reason"
          required
          maxLength={2000}
          rows={3}
          placeholder="Required; provide reason for deactivating this organizer (sent to organizer by email)."
          className="mt-1 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
        />
        <p className="mt-1 text-xs text-amber-800">Up to 2,000 characters.</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-amber-200/70 pt-3">
        <SubmitButton tone="danger">Confirm Deactivation</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteForm({
  application,
  onCancel,
}: {
  application: OrganizerApplication;
  onCancel: () => void;
}) {
  return (
    <form
      action={deleteOrganizerAction}
      onSubmit={(event) =>
        confirmSubmit(
          event,
          `Permanently delete organizer account "${application.email}"? This action cannot be undone. Permanent deletion is rejected if this organizer has created any events.`,
        )
      }
      className="mt-5 rounded-xl border border-rose-200 bg-rose-50/50 p-4 sm:p-5"
    >
      <div className="border-b border-rose-200 pb-3">
        <h3 className="text-sm font-semibold text-rose-950">Permanent Account Deletion (Caution)</h3>
        <p className="mt-0.5 text-xs text-rose-800">
          This permanently purges this account from authentication records. To protect data integrity, deletion is <strong>only allowed if the organizer has 0 events</strong>. Otherwise, use Deactivate instead.
        </p>
      </div>

      <input type="hidden" name="organizerId" value={application.organizer_id} />

      <div className="mt-4">
        <p className="text-xs text-slate-700">
          Organizer: <span className="font-semibold text-slate-900">{application.display_name || application.email}</span> ({application.email})
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rose-200 pt-3">
        <SubmitButton tone="danger">Permanently Delete Account</SubmitButton>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DecisionForm({
  application,
  status,
  label,
  confirm,
}: {
  application: OrganizerApplication;
  status: "approved";
  label: string;
  confirm: string;
}) {
  return (
    <form action={manageOrganizerAction} onSubmit={(event) => confirmSubmit(event, confirm)}>
      <input type="hidden" name="organizerId" value={application.organizer_id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}

function ReasonForm({
  application,
  status,
  label,
  confirm,
  reasonLabel,
}: {
  application: OrganizerApplication;
  status: "rejected" | "removed";
  label: string;
  confirm: string;
  reasonLabel: string;
}) {
  return (
    <form
      action={manageOrganizerAction}
      onSubmit={(event) => confirmSubmit(event, confirm)}
      className="grid w-full gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end"
    >
      <input type="hidden" name="organizerId" value={application.organizer_id} />
      <input type="hidden" name="status" value={status} />
      <label className="text-xs font-semibold text-zinc-700">
        {reasonLabel}
        <textarea
          name="reason"
          required
          maxLength={2000}
          rows={2}
          placeholder="Required; up to 2,000 characters"
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
        />
      </label>
      <SubmitButton tone="danger">{label}</SubmitButton>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 font-medium text-zinc-900 break-words">{value}</dd>
    </div>
  );
}

function SubmitButton({
  children,
  tone = "primary",
}: {
  children: string;
  tone?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const style =
    tone === "danger"
      ? "bg-rose-700 text-white hover:bg-rose-800"
      : "bg-indigo-700 text-white hover:bg-indigo-800";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${style}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function confirmSubmit(event: FormEvent<HTMLFormElement>, message: string) {
  if (typeof window !== "undefined" && !window.confirm(message)) {
    event.preventDefault();
  }
}
