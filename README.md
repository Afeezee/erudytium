# Erudytium

Erudytium is a production-oriented academic platform that combines an e-library with real-time collaborative study rooms. It is built for students, lecturers, and administrators who need authenticated access, moderated resource workflows, live room collaboration, announcements, analytics, and operational tooling in one system.

## Features

- Clerk authentication with email/password and OAuth-ready sign-in flows
- Neon PostgreSQL schema managed by Drizzle ORM
- Full e-library workflow: search, filtering, upload moderation, bookmarks, reviews, citations, and requests
- Real-time study rooms with presence, typing indicators, pinned messages, invite codes, moderation, and attachments (Pusher Channels)
- Admin console for analytics, users, resources, requests, rooms, announcements, and audit logs
- Notification preferences, announcement publishing, and in-app notification stream (Pusher private channels)
- File uploads backed by Vercel Blob (avatars, library resources, room attachments)

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + Radix/shadcn-style UI primitives |
| Authentication | Clerk |
| Database | Neon PostgreSQL + Drizzle ORM |
| File Storage | Vercel Blob |
| Realtime | Pusher Channels (presence, private channels, client events) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animations | Framer Motion |
| Email | Resend |
| Deployment | Vercel |

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment example and fill in the values.

```bash
copy .env.local.example .env.local
```

3. Create the external services (free tiers are fine):
   - **Neon**: create a project at <https://neon.tech>, copy the pooled connection string (append `?sslmode=require`), and set it as `DATABASE_URL`.
   - **Clerk**: create an application at <https://clerk.com>, copy the keys into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, and set a webhook pointing to `/api/webhooks/clerk` with signing secret `CLERK_WEBHOOK_SECRET`.
   - **Pusher Channels**: create a free app at <https://dashboard.pusher.com/apps>. Fill in `PUSHER_APP_ID`, `PUSHER_SECRET`, `PUSHER_CLUSTER` (server-side) and `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` (browser).
   - **Vercel Blob**: Vercel dashboard → your project → Storage → create a Blob store, then copy `BLOB_READ_WRITE_TOKEN` into `.env.local` (Vercel auto-injects it in production).
   - **Resend**: `RESEND_API_KEY` (and verified `RESEND_FROM_EMAIL`) for outbound email.

4. Apply the Drizzle migrations against Neon:

```bash
npm run db:push
```

   `db:push` syncs the schema in `lib/db/schema.ts` directly to the database. For a controlled migration flow instead, use `db:generate` (writes a SQL file under `drizzle/`) and `db:migrate` (applies committed migrations).

5. Seed the default categories by running `drizzle/0001_seed_categories.sql` in the Neon SQL editor (or `psql`).

6. Start the app.

```bash
npm run dev
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (pooled, with `?sslmode=require`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Svix secret for Clerk webhook verification and user profile sync |
| `PUSHER_APP_ID` | Pusher Channels app id (server) |
| `PUSHER_SECRET` | Pusher Channels secret (server) |
| `PUSHER_CLUSTER` | Pusher Channels cluster (server) |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher Channels key exposed to the browser |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher Channels cluster exposed to the browser |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token (auto-injected in production) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified Resend sender (e.g. `notifications@yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | Public application base URL |

## Folder Structure

```text
app/
  (auth)/
  (admin)/admin/
  dashboard/
  api/
    pusher/auth/
    upload/{avatar,resource,room-attachment}/
    webhooks/clerk/
components/
  admin/ announcements/ layout/ library/ profile/ rooms/ settings/ ui/
lib/
  actions/
  blob/
  db/
    schema.ts
    index.ts
    queries/
  pusher/
    server.ts
    client.ts
  auth.ts
  constants.ts
  env.ts
  validations.ts
drizzle/
docs/
```

## Key Workflows

### Authentication and profile sync

- Clerk handles sign-in and sign-up.
- Clerk webhooks upsert matching rows in the Neon `users` table via the admin-trusted connection.
- On the first authenticated request, if no row exists yet, the app bootstraps one from the Clerk profile.

### Library operations

- Users browse approved resources with search, filters, sort, and pagination.
- Uploads are stored directly in Vercel Blob with a server-signed token.
- Reviews, bookmarks, related resources, and generated citations are available on each resource detail page.

### Realtime study rooms

- Room pages subscribe to a Pusher presence channel (`presence-room-<id>`).
- The server triggers `message:new`, `message:updated`, `message:deleted` after each action.
- Typing indicators use Pusher client-events; presence membership drives the online list.
- Attachments upload directly to Vercel Blob with a server-signed token scoped to the room.

### Notifications

- Each user is subscribed to a Pusher private channel (`private-user-<id>`).
- `createNotification` persists to Neon and triggers `notification:new` so the bell updates live.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Set all variables from `.env.local.example` for the Production environment (and Preview if used). `BLOB_READ_WRITE_TOKEN` is auto-injected by the Blob integration.
3. Deploy with the default Next.js build command.

### Neon

1. Run `npm run db:push` once (or `db:generate` + `db:migrate` for versioned migrations).
2. Apply `drizzle/0001_seed_categories.sql` to seed the default categories.

### Clerk

1. Set production redirect URLs for sign-in and sign-up.
2. Register the webhook endpoint at `/api/webhooks/clerk` with the signing secret.

## Production Checklist

See [docs/deployment-checklist.md](docs/deployment-checklist.md).
