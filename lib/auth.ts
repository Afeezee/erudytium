import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { User, UserRole } from "@/types";

export const requireAuth = async () => {
  const authState = await auth();

  if (!authState.userId) {
    return authState.redirectToSignIn();
  }

  return authState;
};

const bootstrapCurrentUserRecord = async (clerkId: string): Promise<User> => {
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

  const [row] = await db
    .insert(users)
    .values({
      clerk_id: clerkId,
      email,
      name,
      avatar_url: clerkUser.imageUrl ?? null
    })
    .onConflictDoUpdate({
      target: users.clerk_id,
      set: {
        email,
        name,
        avatar_url: clerkUser.imageUrl ?? null
      }
    })
    .returning();

  return row as unknown as User;
};

export const getCurrentUserRecord = cache(async (): Promise<User> => {
  const authState = await requireAuth();
  const clerkId = authState.userId;

  const [row] = await db.select().from(users).where(eq(users.clerk_id, clerkId)).limit(1);

  if (row) {
    return row as unknown as User;
  }

  return bootstrapCurrentUserRecord(clerkId);
});

export const requireRole = async (roles: UserRole[]) => {
  const user = await getCurrentUserRecord();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
};
