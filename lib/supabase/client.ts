import { createBrowserClient } from "@supabase/ssr";

type AccessTokenResolver = string | null | undefined | (() => Promise<string | null | undefined> | string | null | undefined);

const resolveAccessToken = async (accessToken?: AccessTokenResolver) => {
  if (typeof accessToken === "function") {
    return (await accessToken()) ?? null;
  }

  return accessToken ?? null;
};

export const createClient = (accessToken?: AccessTokenResolver) =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      accessToken: () => resolveAccessToken(accessToken)
    }
  );