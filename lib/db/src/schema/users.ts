import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { check, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "sigs_users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    avatar: text("avatar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("sigs_users_status_active", sql`${table.status} = 'active'`)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const publicUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["ADMINISTRADOR", "SUPERVISOR", "TECNICO", "CLIENTE"]),
  status: z.literal("active"),
  avatar: z.string().nullable().optional(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
