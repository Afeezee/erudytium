import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { room_members, users } from "@/lib/db/schema";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return new Response("Invalid payload", { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, avatar_url: users.avatar_url })
    .from(users)
    .where(eq(users.clerk_id, clerkId))
    .limit(1);

  if (!user) {
    return new Response("User not provisioned", { status: 403 });
  }

  if (channelName.startsWith("private-user-")) {
    const expected = `private-user-${user.id}`;
    if (channelName !== expected) {
      return new Response("Forbidden", { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return Response.json(authResponse);
  }

  if (channelName.startsWith("presence-room-")) {
    const roomId = channelName.slice("presence-room-".length);

    const [membership] = await db
      .select({ id: room_members.id })
      .from(room_members)
      .where(and(eq(room_members.room_id, roomId), eq(room_members.user_id, user.id)))
      .limit(1);

    if (!membership) {
      return new Response("Not a room member", { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: user.id,
      user_info: {
        name: user.name ?? "Member",
        avatarUrl: user.avatar_url ?? null
      }
    });
    return Response.json(authResponse);
  }

  return new Response("Unsupported channel", { status: 400 });
}
