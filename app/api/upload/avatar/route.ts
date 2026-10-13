import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { AVATAR_UPLOAD_PREFIX, MAX_AVATAR_UPLOAD_BYTES } from "@/lib/constants";

const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

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
        if (!pathname.startsWith(AVATAR_UPLOAD_PREFIX)) {
          throw new Error(`Invalid upload target. Expected "${AVATAR_UPLOAD_PREFIX}" prefix.`);
        }
        return {
          allowedContentTypes: ALLOWED_AVATAR_TYPES,
          maximumSizeInBytes: MAX_AVATAR_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ clerkId: userId })
        };
      },
      onUploadCompleted: async () => {}
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
