import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ALLOWED_RESOURCE_MIME_TYPES, MAX_RESOURCE_UPLOAD_BYTES, RESOURCE_UPLOAD_PREFIX } from "@/lib/constants";

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
        if (!pathname.startsWith(RESOURCE_UPLOAD_PREFIX)) {
          throw new Error(`Invalid upload target. Expected "${RESOURCE_UPLOAD_PREFIX}" prefix.`);
        }
        return {
          allowedContentTypes: [...ALLOWED_RESOURCE_MIME_TYPES],
          maximumSizeInBytes: MAX_RESOURCE_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ clerkId: userId })
        };
      },
      onUploadCompleted: async () => {
        // Finalization happens in the finalizeResourceUpload server action.
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
