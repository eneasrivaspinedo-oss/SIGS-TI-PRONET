import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const projectsTable = pgTable("sigs_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("planning"),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  leadName: text("lead_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
