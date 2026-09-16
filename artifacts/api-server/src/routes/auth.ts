import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetCurrentUserResponse,
  LoginBody,
  LoginResponse,
} from "@workspace/api-zod";
import {
  clearSession,
  createSession,
  getSessionUser,
  toPublicUser,
} from "../lib/auth";

const router: IRouter = Router();

export function verifyPassword(plainPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.status, "active")))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Correo o contraseña incorrectos" });
    return;
  }

  await createSession(user.id, res);
  res.json(LoginResponse.parse({ user: toPublicUser(user) }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await clearSession(req, res);
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(user));
});

export default router;
