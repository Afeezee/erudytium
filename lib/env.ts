import { z } from "zod";

const fullEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1)
});

const webhookEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1)
});

export type Env = z.infer<typeof fullEnvSchema>;
export type WebhookEnv = z.infer<typeof webhookEnvSchema>;

let cachedEnv: Env | null = null;
let cachedWebhookEnv: WebhookEnv | null = null;

export const getEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = fullEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
  });

  return cachedEnv;
};

export const getWebhookEnv = (): WebhookEnv => {
  if (cachedWebhookEnv) {
    return cachedWebhookEnv;
  }

  cachedWebhookEnv = webhookEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET
  });

  return cachedWebhookEnv;
};
