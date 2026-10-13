import Pusher from "pusher";

const globalForPusher = globalThis as unknown as { __erudytiumPusher?: Pusher };

const buildClient = () => {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Pusher server env vars missing. Set PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER."
    );
  }

  return new Pusher({ appId, key, secret, cluster, useTLS: true });
};

export const getPusherServer = (): Pusher => {
  if (globalForPusher.__erudytiumPusher) {
    return globalForPusher.__erudytiumPusher;
  }
  const client = buildClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPusher.__erudytiumPusher = client;
  }
  return client;
};

export const pusherServer: Pusher = new Proxy({} as Pusher, {
  get(_target, prop) {
    const client = getPusherServer();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  }
});

export const roomChannel = (roomId: string) => `presence-room-${roomId}`;
export const userChannel = (userId: string) => `private-user-${userId}`;
export const roomTypingChannel = (roomId: string) => `presence-room-${roomId}`;
