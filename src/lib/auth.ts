import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const SESSION_COOKIE = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  username: string;
  displayName: string;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie. Safe to call from Server Components. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decryptSession(token);
}

/** Sets the session cookie. Only callable from a Server Action or Route Handler. */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/** Clears the session cookie. Only callable from a Server Action or Route Handler. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<SessionPayload | null> {
  const { compare } = await import("bcryptjs");
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  return { userId: user.id, username: user.username, displayName: user.displayName };
}

/** Fetches the full current user record, or null if not logged in. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

/** The other household user (peer approver), or null if not logged in. */
export async function getPeerUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findFirst({ where: { id: { not: session.userId } } });
}
