import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  clientsTable,
  incidentsTable,
  projectsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger";

const defaultUsers = [
  {
    name: "Jhon Abanto",
    email: "admin@sigs-ti.test",
    role: "ADMINISTRADOR",
    status: "active",
    avatar: "JA",
  },
  {
    name: "Eneas Rivas",
    email: "supervisor@sigs-ti.test",
    role: "SUPERVISOR",
    status: "active",
    avatar: "ER",
  },
  {
    name: "Carlos Usca",
    email: "tecnico@sigs-ti.test",
    role: "TECNICO",
    status: "active",
    avatar: "CU",
  },
  {
    name: "Cristiano Ronaldo Dosantos",
    email: "cliente@sigs-ti.test",
    role: "CLIENTE",
    status: "active",
    avatar: "CR",
  },
] as const;

export async function seedDatabase(): Promise<void> {
  const existingUsers = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existingUsers.length > 0) {
    return;
  }

  const passwordHash = bcrypt.hashSync("Pronet2026", 10);

  await db.transaction(async (tx) => {
    const users = await tx
      .insert(usersTable)
      .values(defaultUsers.map((user) => ({ ...user, passwordHash })))
      .returning({ id: usersTable.id });

    const [acme, andes] = await tx
      .insert(clientsTable)
      .values([
        {
          name: "ACME Corporación",
          industry: "Servicios financieros",
          contactName: "María Torres",
          contactEmail: "maria.torres@acme.test",
          phone: "+51 987 321 654",
        },
        {
          name: "Andes Retail",
          industry: "Retail",
          contactName: "Diego Salazar",
          contactEmail: "diego.salazar@andes.test",
          phone: "+51 981 555 202",
        },
      ])
      .returning({ id: clientsTable.id });

    await tx.insert(projectsTable).values([
      {
        name: "Migración de red corporativa",
        clientId: acme.id,
        status: "active",
        progress: 68,
        startDate: "2026-08-01",
        dueDate: "2026-10-18",
        leadName: "Carlos Usca",
      },
      {
        name: "Mesa de ayuda Andes",
        clientId: andes.id,
        status: "planning",
        progress: 24,
        startDate: "2026-09-01",
        dueDate: "2026-11-02",
        leadName: "Eneas Rivas",
      },
    ]);

    await tx.insert(incidentsTable).values([
      {
        code: "INC-2026-001",
        title: "Intermitencia en enlace principal",
        description: "El enlace WAN presenta cortes breves durante la jornada.",
        clientId: acme.id,
        priority: "critical",
        status: "in_progress",
        category: "Conectividad",
        assigneeId: users[2].id,
      },
      {
        code: "INC-2026-002",
        title: "Usuarios no reciben correo corporativo",
        description: "Se reporta retraso en la entrega de mensajes externos.",
        clientId: andes.id,
        priority: "high",
        status: "open",
        category: "Aplicaciones",
        assigneeId: users[1].id,
      },
      {
        code: "INC-2026-003",
        title: "Solicitud de acceso a VPN",
        description: "Alta de acceso remoto para equipo de operaciones.",
        clientId: acme.id,
        priority: "medium",
        status: "pending",
        category: "Seguridad",
        assigneeId: users[2].id,
      },
    ]);
  });

  logger.info("SIGS-TI seed completed");
}
