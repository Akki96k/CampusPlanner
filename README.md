# CampusPlanner

CampusPlanner is a college event management application built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js 20.9 or newer
- npm
- A Supabase project (needed to use authentication and events)
- Supabase CLI (needed to run database migrations and database tests locally)

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and enter your Supabase project URL and publishable key. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin (for example, `https://campusplanner.example.com`) in every deployed environment; use `http://localhost:3000` only on your development computer. A phone cannot open a `localhost` link sent by a computer.
3. Apply all SQL migrations in `supabase/migrations/` in filename order in the Supabase SQL Editor, or use the Supabase CLI migration workflow.
4. Start the development server with `npm run dev`.
5. Open [http://localhost:3000](http://localhost:3000).

Never put a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable or client-side module. The project uses `@supabase/ssr` with cookie-backed browser and server clients. In Next.js 16, `proxy.ts` refreshes sessions; use `supabase.auth.getClaims()` to verify identity in server code before protecting data or pages. Add both `http://localhost:3000/**` (development) and your deployed origin's `/auth/callback` and `/auth/confirm` routes to Supabase Auth's allowed redirect URLs.

### Password recovery email setup

For mobile and cross-browser recovery links, update **Supabase Dashboard → Authentication → Email Templates → Reset Password** to use this link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login/reset-password">Reset password</a>
```

Set the Supabase Auth **Site URL** to the same deployed HTTPS origin as `NEXT_PUBLIC_SITE_URL`. Add that origin's `/auth/confirm` route to the Auth URL allow list. The token-hash link works when opened in a different browser or on a phone because it does not rely on a verifier cookie from the device that requested the email. The link is single-use and expires according to the Supabase email OTP settings. If Supabase reports a recent-email rate limit, wait a few minutes and use the latest email rather than repeatedly resending.

Student is the default public signup role. Organizer applicants select Organizer on the signup form and must be approved by faculty. Only a trusted project administrator should assign a faculty role in the SQL Editor after confirming the account owner, for example:

```sql
update public.profiles as profile
set role = 'faculty_admin'
from auth.users as account
where account.id = profile.id
  and account.email = 'faculty@yourcollege.edu';
```

There is no in-app faculty role editor. Do not manually promote new organizers by changing `profiles.role`; they must apply from signup and be approved through Faculty → Manage organizers. Migration `202610310006` preserves existing organizer accounts as approved.

### Organizer approval and email setup

New Organizer signups create a `pending` application. The database role check, organizer server actions, route guard, and event/registration RLS policies require an `approved` application. Faculty can approve, reject with a reason, remove approved access with a reason, and restore removed or rejected applications from **Faculty → Manage organizers**. Student signup remains the default, and public metadata cannot assign the faculty role.

Set these server-side environment variables to enable automatic delivery:

- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role key, used only on the server to generate a recovery token and process the locked email outbox.
- `RESEND_API_KEY` — an API key for a Resend account.
- `EMAIL_FROM` — sender address on a domain verified in Resend, for example `CampusPlanner <notifications@your-verified-domain.edu>`.
- `EMAIL_OUTBOX_CRON_SECRET` — a strong random secret used to authorize retries.

Keep all four out of browser code and source control. The approval transaction writes the status, in-app notification, and an idempotent outbox row atomically. The app attempts delivery after the transaction. Configure a scheduler to POST to `/api/internal/organizer-email-outbox` every five minutes with `Authorization: Bearer <EMAIL_OUTBOX_CRON_SECRET>` to retry failed or pending deliveries (up to ten attempts); an email outage does not roll back the faculty decision. The outbox records provider errors and attempt times, but never stores password setup tokens or links. Supabase recovery token expiry is controlled in the Supabase Auth email/OTP settings.

The service-role key and Resend credentials are not configured in the repository, so emails remain queued until those values are supplied in the deployment environment. The SQL migration and application code do not claim provider delivery until a real Resend request succeeds.

## Authentication routes

- `/signup` — create an email and password account. If email confirmation is enabled, the user must confirm their address before signing in.
- `/login` — sign in with email and password.
- `/dashboard` — protected page that verifies the user's claims and lists approved upcoming events.
- `/organizer` — organizer-only event creation, draft review, and approval submission.
- `/faculty` — faculty/admin-only event approval and rejection queue.
- `/faculty/organizers` — faculty-only organizer application and access management.
- `/organizer/access` — organizer-facing pending, rejected, or removed status page.
- `/auth/callback` — exchanges Supabase's one-time PKCE code for a cookie-backed session.

## Available checks

- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript check
- `npm test` — auth, event-search, and event-form validation tests
- `supabase test db` — database permission and workflow tests in `supabase/tests/` (requires Supabase CLI and a local database)
- `npm run build` — production build

## Project structure

- `src/app/` — frontend routes, pages, layouts, and route-specific UI
- `src/components/` — reusable frontend components
- `public/` — static frontend assets
- `src/backend/actions/` — server actions for authentication, events, registration, notifications, and dashboards
- `src/backend/lib/` — backend domain logic, validation, authorization, and Supabase client/data access helpers
- `supabase/migrations/` — database schema and policy migrations, applied in filename order
- `supabase/tests/` — database permission and workflow tests
- Root config files (`package.json`, `tsconfig.json`, `next.config.ts`, `proxy.ts`, etc.) — shared app tooling and framework configuration

Next.js requires its App Router under `src/app/`, so frontend routes stay there. Backend actions and supporting logic are grouped separately under `src/backend/`. Database migrations remain in Supabase's conventional `supabase/` directory. Generate fresh TypeScript database types from the applied schema before making schema changes in later stages.
# CampusPlanner database setup

Apply Supabase migrations in filename order:

1. `supabase/migrations/202610190001_initial_events_schema.sql`
2. `supabase/migrations/202610190002_event_workflows.sql`
3. `supabase/migrations/202610190003_event_registrations.sql`
4. `supabase/migrations/202610190004_event_rejection_remarks.sql`
5. `supabase/migrations/202610190005_notifications.sql`
6. `supabase/migrations/202610310006_organizer_approval_and_email_outbox.sql`

The third migration adds private student registrations, per-registration attendance state, row-level security, and authorization triggers. The fourth adds private faculty rejection remarks and the atomic rejection RPC. The fifth adds persistent, recipient-scoped notifications and database workflow triggers. Migration 006 adds faculty-managed organizer applications and a transactional email outbox; it backfills existing organizers as approved and estimates their original approval date from profile creation time because prior approval history was not stored. Apply migrations in order using the Supabase SQL Editor or the Supabase CLI; migration 005 also adds `notifications` to the Realtime publication when it exists. Organizer RLS tests are in `supabase/tests/organizer_approval_rls.test.sql`. Configure `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin and add `/auth/callback` and `/auth/confirm` to Supabase Auth's allowed redirect URLs. Set `NEXT_PUBLIC_HELP_URL` to the campus help page if one exists; leave it unset otherwise. Configure Supabase Auth email delivery and its built-in abuse protections in the Supabase Dashboard. Production deployments must use HTTPS.

The migrations and RLS tests are committed locally but have not been applied to or verified against a live Supabase project.
