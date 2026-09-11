import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { usersTable } from "./users";

export const incidentsTable = pgTable("sigs_incidents", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "restrict" }),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  category: text("category").notNull(),
  assigneeId: integer("assignee_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
