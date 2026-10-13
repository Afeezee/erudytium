import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";
import { room_members, users } from "@/lib/db/schema";
import { MAX_MESSAGE_UPLOAD_BYTES, MESSAGE_UPLOAD_PREFIX } from "@/lib/constants";

const ensureRoomMember = async (clerkId: string, roomId: string) => {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerk_id, clerkId)).limit(1);
  if (!user) {
    throw new Error("User not provisioned");
  }
  const [membership] = await db
    .select({ id: room_members.id, is_muted: room_members.is_muted })
    .from(room_members)
    .where(and(eq(room_members.room_id, roomId), eq(room_members.user_id, user.id)))
    .limit(1);

  if (!membership) {
    throw new Error("Not a room member");
  }

  if (membership.is_muted) {
    throw new Error("You are muted in this room");
  }
};

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) {
          throw new Error("Unauthorized");
        }
        if (!pathname.startsWith(MESSAGE_UPLOAD_PREFIX)) {
          throw new Error(`Invalid upload target. Expected "${MESSAGE_UPLOAD_PREFIX}" prefix.`);
        }
        // pathname: "room-attachments/<roomId>/<file>"
        const roomId = pathname.split("/")[1];
        if (!roomId) {
          throw new Error("Missing room id in upload path.");
        }
        await ensureRoomMember(userId, roomId);
        return {
          maximumSizeInBytes: MAX_MESSAGE_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ clerkId: userId, roomId })
        };
      },
      onUploadCompleted: async () => {}
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
