"use client";

import PusherClient from "pusher-js";

let instance: PusherClient | null = null;

export const getPusherClient = () => {
  if (typeof window === "undefined") {
    throw new Error("Pusher client can only be used in the browser.");
  }

  if (instance) {
    return instance;
  }

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error("NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER must be set.");
  }

  instance = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/pusher/auth"
  });

  return instance;
};

export const resetPusherClient = () => {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
};
