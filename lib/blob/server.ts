import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export type BlobUploadResult = {
  url: string;
  pathname: string;
  contentType: string | null;
  contentDisposition: string | null;
};

type HandleBlobUploadArgs = {
  body: HandleUploadBody;
  request: Request;
  pathnamePrefix: string;
  allowedContentTypes?: string[];
  maxBytes?: number;
  onComplete?: (blob: BlobUploadResult, tokenPayload: string | null) => Promise<void>;
};

export const handleBlobUpload = async ({
  body,
  request,
  pathnamePrefix,
  allowedContentTypes,
  maxBytes,
  onComplete
}: HandleBlobUploadArgs) => {
  return handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(pathnamePrefix)) {
        throw new Error(`Invalid upload target. Expected prefix "${pathnamePrefix}".`);
      }

      return {
        allowedContentTypes,
        maximumSizeInBytes: maxBytes,
        addRandomSuffix: true
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      if (!onComplete) {
        return;
      }

      await onComplete(
        {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType ?? null,
          contentDisposition: blob.contentDisposition ?? null
        },
        tokenPayload ?? null
      );
    }
  });
};

export const deleteBlob = async (url: string) => {
  try {
    await del(url);
  } catch (error) {
    console.error("[blob] delete failed", { url, error });
  }
};
