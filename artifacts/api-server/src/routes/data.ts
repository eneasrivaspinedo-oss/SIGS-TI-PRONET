import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, clientsTable, incidentsTable, projectsTable, usersTable } from "@workspace/db";
import {
  CreateClientBody,
  CreateClientResponse,
  CreateIncidentBody,
  CreateIncidentResponse,
  CreateProjectBody,
  CreateProjectResponse,
  DeleteClientParams,
  GetDashboardSummaryResponse,
  ListClientsQueryParams,
  ListClientsResponse,
  ListIncidentsQueryParams,
  ListIncidentsResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  ListUsersResponse,
  UpdateClientBody,
  UpdateClientParams,
  UpdateClientResponse,
  UpdateIncidentBody,
  UpdateIncidentParams,
  UpdateIncidentResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import { getSessionUser } from "../lib/auth";

const router: IRouter = Router();

function joinConditions(...conditions: Array<SQL | undefined>): SQL | undefined {
  const valid = conditions.filter((condition): condition is SQL => Boolean(condition));
  return valid.length > 0 ? and(...valid) : undefined;
}

async function ensureUser(req: Request, res: Response): Promise<boolean> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return false;
  }
  return true;
}

async function selectClients(search?: string) {
  const where = search
    ? or(ilike(clientsTable.name, `%${search}%`), ilike(clientsTable.industry, `%${search}%`))
    : undefined;
  const query = db.select().from(clientsTable).orderBy(desc(clientsTable.createdAt));
  return where ? query.where(where) : query;
}

async function selectProjects(search?: string, status?: string) {
  const searchCondition = search
    ? or(ilike(projectsTable.name, `%${search}%`), ilike(clientsTable.name, `%${search}%`))
    : undefined;
  const query = db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      clientId: projectsTable.clientId,
      clientName: clientsTable.name,
      status: projectsTable.status,
      progress: projectsTable.progress,
      startDate: projectsTable.startDate,
      dueDate: projectsTable.dueDate,
      leadName: projectsTable.leadName,
    })
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .orderBy(desc(projectsTable.createdAt));
  const where = joinConditions(searchCondition, status ? eq(projectsTable.status, status) : undefined);
  return where ? query.where(where) : query;
}

async function selectIncidents(search?: string, status?: string, priority?: string) {
  const searchCondition = search
    ? or(
        ilike(incidentsTable.code, `%${search}%`),
        ilike(incidentsTable.title, `%${search}%`),
        ilike(clientsTable.name, `%${search}%`),
      )
    : undefined;
  const query = db
    .select({
      id: incidentsTable.id,
      code: incidentsTable.code,
      title: incidentsTable.title,
      description: incidentsTable.description,
      clientId: incidentsTable.clientId,
      clientName: clientsTable.name,
      priority: incidentsTable.priority,
      status: incidentsTable.status,
      category: incidentsTable.category,
      assigneeName: usersTable.name,
      createdAt: incidentsTable.createdAt,
      updatedAt: incidentsTable.updatedAt,
    })
    .from(incidentsTable)
    .innerJoin(clientsTable, eq(incidentsTable.clientId, clientsTable.id))
    .leftJoin(usersTable, eq(incidentsTable.assigneeId, usersTable.id))
    .orderBy(desc(incidentsTable.updatedAt));
  const where = joinConditions(
    searchCondition,
    status ? eq(incidentsTable.status, status) : undefined,
    priority ? eq(incidentsTable.priority, priority) : undefined,
  );
  return where ? query.where(where) : query;
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const [clients, projects, incidents] = await Promise.all([
    selectClients(),
    selectProjects(),
    selectIncidents(),
  ]);

  const activeIncidents = incidents.filter((incident) =>
    ["open", "in_progress", "pending"].includes(incident.status),
  ).length;
  const incidentByStatus = incidents.reduce<Record<string, number>>((result, incident) => {
    result[incident.status] = (result[incident.status] ?? 0) + 1;
    return result;
  }, {});
  res.json(
    GetDashboardSummaryResponse.parse({
      activeIncidents,
      criticalIncidents: incidents.filter(
        (incident) =>
          incident.priority === "critical" &&
          ["open", "in_progress", "pending"].includes(incident.status),
      ).length,
      activeProjects: projects.filter((project) => project.status === "active").length,
      clients: clients.length,
      recentIncidents: incidents.slice(0, 5),
      incidentByStatus,
    }),
  );
});

router.get("/clients", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(ListClientsResponse.parse(await selectClients(parsed.data.search)));
});

router.post("/clients", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
  res.status(201).json(CreateClientResponse.parse(client));
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateClientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [client] = await db
    .update(clientsTable)
    .set(body.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json(UpdateClientResponse.parse(client));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db
    .delete(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .returning();
  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(ListProjectsResponse.parse(await selectProjects(parsed.data.search, parsed.data.status)));
});

router.post("/projects", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      startDate: parsed.data.startDate.toISOString().slice(0, 10),
      dueDate: parsed.data.dueDate.toISOString().slice(0, 10),
    })
    .returning();
  const rows = await selectProjects();
  const created = rows.find((row) => row.id === project.id);
  res.status(201).json(CreateProjectResponse.parse(created));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateProjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { dueDate, ...projectFields } = body.data;
  const update = dueDate
    ? { ...projectFields, dueDate: dueDate.toISOString().slice(0, 10) }
    : projectFields;
  const [project] = await db
    .update(projectsTable)
    .set(update)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Proyecto no encontrado" });
    return;
  }
  const row = (await selectProjects()).find((item) => item.id === project.id);
  res.json(UpdateProjectResponse.parse(row));
});

router.get("/incidents", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = ListIncidentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    ListIncidentsResponse.parse(
      await selectIncidents(parsed.data.search, parsed.data.status, parsed.data.priority),
    ),
  );
});

router.post("/incidents", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const nextCode = `INC-${new Date().getFullYear()}-${String(
    (await db.select({ id: incidentsTable.id }).from(incidentsTable)).length + 1,
  ).padStart(3, "0")}`;
  const [incident] = await db
    .insert(incidentsTable)
    .values({ ...parsed.data, code: nextCode })
    .returning();
  const row = (await selectIncidents()).find((item) => item.id === incident.id);
  res.status(201).json(CreateIncidentResponse.parse(row));
});

router.patch("/incidents/:id", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const params = UpdateIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [incident] = await db
    .update(incidentsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(incidentsTable.id, params.data.id))
    .returning();
  if (!incident) {
    res.status(404).json({ error: "Incidencia no encontrada" });
    return;
  }
  const row = (await selectIncidents()).find((item) => item.id === incident.id);
  res.json(UpdateIncidentResponse.parse(row));
});

router.get("/users", async (req, res): Promise<void> => {
  if (!(await ensureUser(req, res))) return;
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      status: usersTable.status,
      avatar: usersTable.avatar,
    })
    .from(usersTable)
    .orderBy(usersTable.name);
  res.json(ListUsersResponse.parse(users));
});

export default router;
