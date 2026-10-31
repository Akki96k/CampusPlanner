import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { OrganizerEmailOutbox } from "@/backend/lib/supabase/database.types";

type SendResult = "sent" | "pending" | "failed" | "already-claimed";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendOrganizerOutboxMessage(outboxId: string): Promise<SendResult> {
  const admin = createAdminClient();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const siteUrlText = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!admin || !resendKey || !from || !siteUrlText) return "pending";
  try {
    const siteUrl = new URL(siteUrlText);
    const localHttp = siteUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(siteUrl.hostname);
    if (siteUrl.protocol !== "https:" && !localHttp) return "pending";
  } catch {
    return "pending";
  }

  const { data: claimedRows, error: claimError } = await admin.rpc("claim_organizer_email_outbox", { target_id: outboxId });
  if (claimError) return "failed";
  const outbox = claimedRows?.[0] as OrganizerEmailOutbox | undefined;
  if (!outbox) return "already-claimed";

  try {
    const content = await buildEmail(admin, outbox, siteUrlText);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": outbox.transition_id,
      },
      body: JSON.stringify({ from, to: [outbox.email], subject: content.subject, html: content.html, text: content.text }),
      cache: "no-store",
    });
    if (!response.ok) {
      // Persist only the provider status code. Never persist an API response that
      // could accidentally echo any part of the message body or recovery URL.
      const providerResponse = await response.json().catch(() => null) as { name?: string; code?: string } | null;
      if (response.status === 409 && providerResponse?.name === "invalid_idempotent_request") {
        // The stable transition key already produced an email, but a retry
        // generated a fresh one-time token. Treat the original provider send as
        // delivered instead of sending a second password link.
        const { error: finishError } = await admin.rpc("finish_organizer_email_outbox", { target_id: outbox.id, succeeded: true });
        return finishError ? "failed" : "sent";
      }
      await admin.rpc("finish_organizer_email_outbox", {
        target_id: outbox.id,
        succeeded: false,
        failure_detail: `Resend returned HTTP ${response.status}.`,
      });
      return "failed";
    }
    const { error: finishError } = await admin.rpc("finish_organizer_email_outbox", { target_id: outbox.id, succeeded: true });
    return finishError ? "failed" : "sent";
  } catch {
    await admin.rpc("finish_organizer_email_outbox", {
      target_id: outbox.id,
      succeeded: false,
      failure_detail: "Password link generation or email delivery failed.",
    });
    return "failed";
  }
}

export async function processPendingOrganizerEmails(limit = 50) {
  const admin = createAdminClient();
  if (!admin) return { sent: 0, failed: 0, pending: 0 };
  const retryBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: queued, error } = await admin.from("organizer_email_outbox")
    .select("id")
    .in("status", ["pending", "failed"])
    .or(`last_attempt_at.is.null,last_attempt_at.lt.${retryBefore}`)
    .lt("attempts", 10)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return { sent: 0, failed: 0, pending: 0 };

  const results = await Promise.all((queued ?? []).map(({ id }) => sendOrganizerOutboxMessage(id)));
  return {
    sent: results.filter((result) => result === "sent").length,
    failed: results.filter((result) => result === "failed").length,
    pending: results.filter((result) => result === "pending" || result === "already-claimed").length,
  };
}

async function buildEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  item: OrganizerEmailOutbox,
  siteUrlText: string,
) {
  const name = escapeHtml(item.display_name);
  const email = escapeHtml(item.email);
  const reason = item.reason ? escapeHtml(item.reason) : "";
  const approved = item.notification_type === "organizer_approved";
  const restored = item.notification_type === "organizer_restored";
  const removed = item.notification_type === "organizer_removed";

  if (approved) {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: item.email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) throw new Error("Could not generate a password setup link.");
    const setupUrl = new URL("/auth/confirm", siteUrlText);
    setupUrl.searchParams.set("token_hash", tokenHash);
    setupUrl.searchParams.set("type", "recovery");
    setupUrl.searchParams.set("next", "/login/reset-password");
    const link = escapeHtml(setupUrl.toString());
    const subject = "Your CampusPlanner Organizer Account Has Been Approved!";
    const content = `Congratulations! Your request to become a CampusPlanner Organizer has been approved by the Faculty Member. Your account username is ${email}. Please use the secure link below to set your password and activate your account. After setting your password, sign in with your registered email address and new password to access the Organizer Dashboard. You can now manage college events. This one-time link expires according to your Supabase recovery-link settings. If you did not request this account, contact your campus administrator.`;
    const html = emailShell(`<h1 style="margin:0 0 20px;color:#172554;font-size:25px">Organizer account approved</h1><p>Hello ${name},</p><p>Congratulations! Your request to become a CampusPlanner Organizer has been approved by the Faculty Member.</p><div style="margin:24px 0;padding:18px;border-radius:12px;background:#f1f5f9"><p style="margin:0 0 8px"><strong>Username:</strong> ${email}</p><p style="margin:0"><strong>Account status:</strong> Approved</p></div><p>Set your password using the secure link below. Then sign in with your registered email address and new password to access the Organizer Dashboard and manage college events.</p><p style="margin:28px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#4338ca;color:#fff;text-decoration:none;font-weight:700">Set your password</a></p><p style="font-size:13px;color:#475569">This one-time link expires according to your Supabase recovery-link settings. If you did not request this account, contact your campus administrator.</p>`);
    return { subject, html, text: `Hello ${item.display_name},\n\n${content}\n\n${setupUrl.toString()}\n\nCampusPlanner Team\nA Unified Digital Platform for College Event Discovery and Management` };
  }

  const subject = restored
    ? "Your CampusPlanner Organizer Access Has Been Restored"
    : removed
      ? "Your CampusPlanner Organizer Access Has Been Removed"
      : "Update on Your CampusPlanner Organizer Application";
  const title = restored ? "Organizer access restored" : removed ? "Organizer access removed" : "Organizer application update";
  const message = restored
    ? "Faculty has restored your organizer access. You can now sign in to use the Organizer Dashboard."
    : removed
      ? "Faculty has removed your access to organizer features. You can still sign in to browse campus events."
      : "Faculty was unable to approve your organizer application. Organizer features are unavailable. If you have questions, contact your campus administrator.";
  const reasonHtml = reason ? `<div style="margin:22px 0;padding:16px;border-left:4px solid #6366f1;background:#f1f5f9"><strong>Faculty reason</strong><p style="margin:8px 0 0;white-space:pre-wrap">${reason}</p></div>` : "";
  return {
    subject,
    html: emailShell(`<h1 style="margin:0 0 20px;color:#172554;font-size:25px">${title}</h1><p>Hello ${name},</p><p>${message}</p>${reasonHtml}<p style="margin-top:28px">CampusPlanner Team<br /><span style="color:#64748b">A Unified Digital Platform for College Event Discovery and Management</span></p>`),
    text: `Hello ${item.display_name},\n\n${message}${item.reason ? `\n\nFaculty reason: ${item.reason}` : ""}\n\nCampusPlanner Team\nA Unified Digital Platform for College Event Discovery and Management`,
  };
}

function emailShell(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#334155"><div style="max-width:600px;margin:32px auto;padding:0 16px"><div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff"><div style="padding:20px 28px;background:#3730a3;color:#fff;font-size:18px;font-weight:700">CampusPlanner</div><div style="padding:28px;line-height:1.65">${body}<p style="margin-top:30px;color:#64748b">CampusPlanner<br />A Unified Digital Platform for College Event Discovery and Management</p></div></div></div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
