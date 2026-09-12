import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { clientsTable, incidentsTable, projectsTable, usersTable } from "@workspace/db";
import { logger } from "./logger";

const defaultUsers = [
  { name: "Jhon Abanto", email: "admin@sigs-ti.test", role: "ADMINISTRADOR", status: "active", avatar: "JA" },
  { name: "Eneas Rivas", email: "supervisor@sigs-ti.test", role: "SUPERVISOR", status: "active", avatar: "ER" },
  { name: "Carlos Usca", email: "tecnico@sigs-ti.test", role: "TECNICO", status: "active", avatar: "CU" },
  { name: "Cristiano Ronaldo Dosantos", email: "cliente@sigs-ti.test", role: "CLIENTE", status: "active", avatar: "CR" },
] as const;
const defaultClients = [
  { name: "ACME Corporación", industry: "Servicios financieros", contactName: "María Torres", contactEmail: "maria.torres@acme.test", phone: "+51 987 321 654" },
  { name: "Andes Retail", industry: "Retail", contactName: "Diego Salazar", contactEmail: "diego.salazar@andes.test", phone: "+51 981 555 202" },
] as const;
const defaultProjects = [
  { name: "Migración de red corporativa", clientName: "ACME Corporación", status: "active", progress: 68, startDate: "2026-08-01", dueDate: "2026-10-18", leadName: "Carlos Usca" },
  { name: "Mesa de ayuda Andes", clientName: "Andes Retail", status: "planning", progress: 24, startDate: "2026-09-01", dueDate: "2026-11-02", leadName: "Eneas Rivas" },
] as const;
const defaultIncidents = [
  { code: "INC-2026-001", title: "Intermitencia en enlace principal", description: "El enlace WAN presenta cortes breves durante la jornada.", clientName: "ACME Corporación", priority: "critical", status: "in_progress", category: "Conectividad", assigneeEmail: "tecnico@sigs-ti.test" },
  { code: "INC-2026-002", title: "Usuarios no reciben correo corporativo", description: "Se reporta retraso en la entrega de mensajes externos.", clientName: "Andes Retail", priority: "high", status: "open", category: "Aplicaciones", assigneeEmail: "supervisor@sigs-ti.test" },
  { code: "INC-2026-003", title: "Solicitud de acceso a VPN", description: "Alta de acceso remoto para equipo de operaciones.", clientName: "ACME Corporación", priority: "medium", status: "pending", category: "Seguridad", assigneeEmail: "tecnico@sigs-ti.test" },
] as const;

export async function seedDatabase(): Promise<void> {
  const passwordHash = bcrypt.hashSync("Pronet2026", 10);
  await db.transaction(async (tx) => {
    await tx.insert(usersTable).values(defaultUsers.map((user) => ({ ...user, passwordHash }))).onConflictDoNothing({ target: usersTable.email });
    const users = await tx.select({ id: usersTable.id, email: usersTable.email }).from(usersTable);
    const userIds = new Map(users.map((user) => [user.email, user.id]));
    const clientRows = await tx.select({ id: clientsTable.id, name: clientsTable.name }).from(clientsTable);
    const ensureClient = async (input: (typeof defaultClients)[number]) => {
      const existing = clientRows.find((client) => client.name === input.name);
      if (existing) return existing;
      const [created] = await tx.insert(clientsTable).values(input).returning({ id: clientsTable.id, name: clientsTable.name });
      clientRows.push(created);
      return created;
    };
    const acme = await ensureClient(defaultClients[0]);
    const andes = await ensureClient(defaultClients[1]);
    const clientIds = new Map([[acme.name, acme.id], [andes.name, andes.id]]);
    const projectRows = await tx.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable);
    for (const project of defaultProjects) {
      if (projectRows.some((existing) => existing.name === project.name)) continue;
      const clientId = clientIds.get(project.clientName);
      if (!clientId) throw new Error("Missing client for seeded project: " + project.clientName);
      const [created] = await tx.insert(projectsTable).values({ name: project.name, clientId, status: project.status, progress: project.progress, startDate: project.startDate, dueDate: project.dueDate, leadName: project.leadName }).returning({ id: projectsTable.id, name: projectsTable.name });
      projectRows.push(created);
    }
    const incidentRows = await tx.select({ code: incidentsTable.code }).from(incidentsTable);
    for (const incident of defaultIncidents) {
      if (incidentRows.some((existing) => existing.code === incident.code)) continue;
      const clientId = clientIds.get(incident.clientName);
      const assigneeId = userIds.get(incident.assigneeEmail);
      if (!clientId || !assigneeId) throw new Error("Missing relation for seeded incident: " + incident.code);
      await tx.insert(incidentsTable).values({ code: incident.code, title: incident.title, description: incident.description, clientId, priority: incident.priority, status: incident.status, category: incident.category, assigneeId });
      incidentRows.push({ code: incident.code });
    }
  });
  logger.info("SIGS-TI seed completed");
}
