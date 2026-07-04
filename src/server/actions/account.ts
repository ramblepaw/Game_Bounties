"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export type AccountActionState = { error: string | null; success: boolean };

const initialState: AccountActionState = { error: null, success: false };

export async function updateProfile(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await getSession();
  if (!session) return { error: "Not logged in.", success: false };

  const username = String(formData.get("username") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();
  if (!username) return { error: "Username is required.", success: false };
  if (!displayName) return { error: "Display name is required.", success: false };

  if (username !== session.username) {
    const existing = await db.user.findUnique({ where: { username } });
    if (existing && existing.id !== session.userId) {
      return { error: "That username is already taken.", success: false };
    }
  }

  if (username === session.username && displayName === session.displayName) {
    return initialState;
  }

  await db.user.update({ where: { id: session.userId }, data: { username, displayName } });
  await setSessionCookie({ ...session, username, displayName });
  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function updatePassword(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const session = await getSession();
  if (!session) return { error: "Not logged in.", success: false };

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters.", success: false };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords don't match.", success: false };
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect.", success: false };

  const passwordHash = await hash(newPassword, 12);
  await db.user.update({ where: { id: session.userId }, data: { passwordHash } });
  return { error: null, success: true };
}
