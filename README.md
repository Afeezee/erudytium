# Erudytium

Erudytium is a production-oriented academic platform that combines an e-library with real-time collaborative study rooms. It is built for students, lecturers, and administrators who need authenticated access, moderated resource workflows, live room collaboration, announcements, analytics, and operational tooling in one system.

## Features

- Clerk authentication with email/password and Google OAuth-ready sign-in flows
- Supabase PostgreSQL schema with RLS, storage buckets, realtime messaging, presence, and notifications
- Full e-library workflow: search, filtering, upload moderation, bookmarks, reviews, citations, and requests
- Real-time study rooms with presence, typing indicators, pinned messages, invite codes, moderation, and attachments
- Admin console for analytics, users, resources, requests, rooms, announcements, and audit logs
- Notification preferences, announcement publishing, and file validation safeguards

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + Radix/shadcn-style UI primitives |
| Authentication | Clerk |
| Database | Supabase PostgreSQL + RLS |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime (Postgres Changes, Presence, Broadcast) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animations | Framer Motion |
| Email | Resend |
| Deployment | Vercel |
| Testing | Jest + Testing Library |

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment example.

```bash
copy .env.local.example .env.local
```

3. Fill in the required Clerk, Supabase, Resend, and app URL variables.

4. Apply the SQL migrations in `supabase/migrations/` to your Supabase project in timestamp order.

- `202605290001_initial_schema.sql`
- `202605290002_allow_authenticated_user_bootstrap.sql`

5. Complete the Clerk Supabase integration for the environment, add Clerk as a third-party auth provider in Supabase Auth, and point the Clerk webhook to `/api/webhooks/clerk`.

6. Create Supabase storage buckets:

- `avatars`
- `resources`
- `room-attachments`

7. Start the app.

```bash
npm run dev
```

8. Run tests.

```bash
npm test
```

## Environment Variables

| Variable | Description |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon/publishable key used by browser and SSR clients |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key used only by the Clerk webhook route |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk publishable key |
| CLERK_SECRET_KEY | Clerk secret key |
| CLERK_WEBHOOK_SECRET | Svix secret for Clerk webhook verification and user profile sync |
| RESEND_API_KEY | Resend API key for outbound email delivery |
| NEXT_PUBLIC_APP_URL | Public application base URL |

## Folder Structure

```text
app/
  (auth)/
  (dashboard)/
  (admin)/admin/
  api/webhooks/clerk/
components/
  admin/
  announcements/
  layout/
  library/
  profile/
  rooms/
  settings/
  ui/
lib/
  actions/
  supabase/
  utils/
  auth.ts
  constants.ts
  env.ts
  validations.ts
supabase/migrations/
types/
__tests__/
docs/
```

## Key Workflows

### Authentication and profile sync

- Clerk handles sign-in and sign-up UI.
- Clerk webhooks upsert matching rows in the Supabase `users` table.
- Supabase queries use Clerk session tokens through the native Clerk-to-Supabase integration for RLS-aware access.

### Library operations

- Users browse approved resources with search, filters, sort, and pagination.
- Uploads are MIME-validated server-side and inserted with `pending` moderation status.
- Reviews, bookmarks, related resources, and generated citations are available on each resource detail page.

### Realtime study rooms

- Room pages subscribe to new messages through Supabase Realtime.
- Presence shows online members, and broadcast events power typing indicators.
- Moderators and owners can pin messages, mute users, kick members, and promote moderators.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Set all variables from `.env.local.example`.
3. Set the production domain in `NEXT_PUBLIC_APP_URL`.
4. Deploy with the default Next.js build command.

### Supabase

1. Apply all SQL migrations in `supabase/migrations/`.
2. Enable Realtime for `messages` and `notifications`.
3. Create storage buckets and storage policies.
4. Configure Clerk as a third-party auth provider for Supabase.

### Clerk

1. Set production redirect URLs for sign-in and sign-up.
2. Complete the Clerk Supabase integration for the production environment.
3. Register the webhook endpoint at `/api/webhooks/clerk`.

## Screenshots

- Dashboard overview: pending
- Library listing and detail: pending
- Study room experience: pending
- Admin console: pending

## Production Checklist

See [docs/deployment-checklist.md](docs/deployment-checklist.md).