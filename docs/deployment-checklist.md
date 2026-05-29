# Production Deployment Checklist

## Vercel

- Set all environment variables from `.env.local.example`
- Enable analytics and performance monitoring
- Configure the production domain and update `NEXT_PUBLIC_APP_URL`
- Verify image and websocket traffic are allowed in production

## Supabase

- Apply all SQL files in `supabase/migrations/` in timestamp order
- Enable email confirmations if you rely on any Supabase-auth-adjacent flows
- Enable PITR backups
- Set JWT expiry according to institutional session requirements
- Enable Realtime on `messages` and `notifications`
- Create and secure the `avatars`, `resources`, and `room-attachments` buckets

## Clerk

- Switch to the production Clerk instance
- Configure allowed redirect URLs for sign-in, sign-up, and post-auth returns
- Configure the Clerk webhook to point to `/api/webhooks/clerk`
- Complete and verify the Clerk Supabase integration for production
- Confirm new sign-ups create or update matching rows in `public.users`

## Post-Deploy Smoke Tests

- Register a new user through the production sign-up flow
- Upload a resource and verify it enters the pending moderation queue
- Approve the resource from the admin area and confirm the uploader is notified
- Create a study room and join it from a second account using the invite code
- Send a message and confirm realtime delivery, presence, and typing indicators work