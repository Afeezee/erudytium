import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { User, UserRole } from "@/types";

export const requireAuth = async () => {
  const authState = await auth();

  if (!authState.userId) {
    return authState.redirectToSignIn();
  }

  return authState;
};

const bootstrapCurrentUserRecord = async (clerkId: string) => {
  const admin = getAdminClient();
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Authenticated Clerk user could not be loaded.");
  }

  const email =
    clerkUser.emailAddresses.find((address) => address.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  if (!email) {
    throw new Error("Authenticated Clerk user is missing a primary email address.");
  }

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const payload = {
    clerk_id: clerkId,
    email,
    name,
    avatar_url: clerkUser.imageUrl ?? null
  };
  const { data, error } = await admin.from("users").upsert(payload, { onConflict: "clerk_id" }).select("*").single<User>();

  if (!error) {
    return data;
  }

  const { data: existingUser, error: existingUserError } = await admin
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle<User>();

  if (!existingUserError && existingUser) {
    return existingUser;
  }

  console.error("[auth] bootstrapCurrentUserRecord failed", {
    clerkId,
    upsertError: error,
    lookupError: existingUserError
  });
  throw new Error(error.message);
};

export const getCurrentUserRecord = cache(async () => {
  const authState = await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", authState.userId)
    .maybeSingle<User>();

  if (error) {
    console.error("[auth] getCurrentUserRecord lookup failed via user-scoped client", {
      clerkId: authState.userId,
      error
    });

    const admin = getAdminClient();
    const { data: fallbackData, error: fallbackError } = await admin
      .from("users")
      .select("*")
      .eq("clerk_id", authState.userId)
      .maybeSingle<User>();

    if (fallbackError) {
      console.error("[auth] getCurrentUserRecord admin fallback failed", {
        clerkId: authState.userId,
        error: fallbackError
      });
      throw new Error(fallbackError.message);
    }

    if (fallbackData) {
      return fallbackData;
    }

    return bootstrapCurrentUserRecord(authState.userId);
  }

  if (data) {
    return data;
  }

  return bootstrapCurrentUserRecord(authState.userId);
});

export const requireRole = async (roles: UserRole[]) => {
  const user = await getCurrentUserRecord();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
};

export const getSupabaseAccessToken = async () => {
  const { getToken } = await requireAuth();
  return getToken();
};