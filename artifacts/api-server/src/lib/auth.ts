import { createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import type { PublicUser } from "@workspace/db";

export const SESSION_COOKIE = "sigs_session";
const SESSION_DAYS = 7;

function sessionDigest(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "sigs-ti-development-session";
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function toPublicUser(user: typeof usersTable.$inferSelect): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as PublicUser["role"],
    status: "active",
    avatar: user.avatar,
  };
}

export async function createSession(userId: number, res: Response): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({
    userId,
    tokenHash: sessionDigest(token),
    expiresAt,
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function clearSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, sessionDigest(token)));
  }
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
}

export async function getSessionUser(req: Request): Promise<PublicUser | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) {
    return null;
  }

  const [result] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.tokenHash, sessionDigest(token)),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result ? toPublicUser(result.user) : null;
}
