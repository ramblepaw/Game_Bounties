"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyCredentials, setSessionCookie, clearSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a username and password." };
  }

  const session = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!session) {
    return { error: "Incorrect username or password." };
  }

  await setSessionCookie(session);
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
