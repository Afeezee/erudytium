import { headers } from "next/headers";
import { Webhook } from "svix";
import { getWebhookEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";

type ClerkWebhookUser = {
  id: string;
  email_addresses?: { email_address: string }[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

export async function POST(request: Request) {
  const env = getWebhookEnv();
  const adminClient = getAdminClient();
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
  const email = user.email_addresses?.[0]?.email_address;

  if (!email) {
    return new Response("Missing primary email", { status: 500 });
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || null;
  const payload = {
    clerk_id: user.id,
    email,
    name,
    avatar_url: user.image_url ?? null
  };

  if (event.type === "user.created" || event.type === "user.updated") {
    const { error } = await adminClient.from("users").upsert(payload, { onConflict: "clerk_id" });

    if (error) {
      return new Response(error.message, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}