import { headers } from "next/headers";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getWebhookEnv } from "@/lib/env";

type ClerkWebhookUser = {
  id: string;
  email_addresses?: { email_address: string }[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

export async function POST(request: Request) {
  const env = getWebhookEnv();
  const rawPayload = await request.text();
  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing webhook headers", { status: 400 });
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let event: { type: string; data: ClerkWebhookUser };

  try {
    event = wh.verify(rawPayload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as { type: string; data: ClerkWebhookUser };
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const user = event.data;

  if (event.type === "user.deleted") {
    await db.delete(users).where(eq(users.clerk_id, user.id));
    return Response.json({ ok: true });
  }

  const email = user.email_addresses?.[0]?.email_address;

  if (!email) {
    return new Response("Missing primary email", { status: 500 });
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

  if (event.type === "user.created" || event.type === "user.updated") {
    await db
      .insert(users)
      .values({
        clerk_id: user.id,
        email,
        name,
        avatar_url: user.image_url ?? null
      })
      .onConflictDoUpdate({
        target: users.clerk_id,
        set: {
          email,
          name,
          avatar_url: user.image_url ?? null
        }
      });
  }

  return Response.json({ ok: true });
}
