# Production Deployment Checklist

## Vercel

- Set all environment variables from `.env.local.example` for the Production environment (and Preview if you use preview deploys). `BLOB_READ_WRITE_TOKEN` is auto-injected when the Blob store is connected to the project.
- Enable analytics and performance monitoring
- Configure the production domain and update `NEXT_PUBLIC_APP_URL`
- Connect a Vercel Blob store under Storage → Blob (used for avatars, library resources, and room attachments)

## Neon

- Create the project and copy the pooled connection string into `DATABASE_URL` (append `?sslmode=require`)
- Apply the schema with `npm run db:push` (or `db:generate` + `db:migrate` for a controlled migration flow)
- Run `drizzle/0001_seed_categories.sql` in the Neon SQL editor to seed the default categories
- Enable branching if you want preview-deploy isolation

## Pusher Channels

- Create a Channels app at <https://dashboard.pusher.com/apps>
- Copy `app_id`, `secret`, `cluster` into `PUSHER_APP_ID`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- Copy `key` and `cluster` into `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER`
- Enable "Client Events" on the app (required for typing indicators) in the app's Settings tab
- The auth endpoint lives at `/api/pusher/auth` and is registered automatically — no extra Pusher config needed

## Clerk

- Switch to the production Clerk instance
- Configure allowed redirect URLs for sign-in, sign-up, and post-auth returns
- Configure the Clerk webhook to point to `https://<your-domain>/api/webhooks/clerk` using the signing secret in `CLERK_WEBHOOK_SECRET`
- Confirm new sign-ups create or update matching rows in `users`

## Post-Deploy Smoke Tests

- Register a new user through the production sign-up flow and confirm the dashboard loads
- Upload a resource and verify it reaches Vercel Blob and enters the pending moderation queue
- Approve the resource from the admin area and confirm the uploader is notified (notification bell updates live via Pusher)
- Create a study room and join it from a second account using the invite code
- Send a message and confirm realtime delivery, presence, and typing indicators work
