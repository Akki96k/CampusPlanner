import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processPendingOrganizerEmails } from "@/backend/lib/email/organizer-outbox";

export async function POST(request: NextRequest) {
  const expected = process.env.EMAIL_OUTBOX_CRON_SECRET?.trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided || !safeEqual(expected, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingOrganizerEmails();
  return NextResponse.json(result, { status: 200 });
}

function safeEqual(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}
