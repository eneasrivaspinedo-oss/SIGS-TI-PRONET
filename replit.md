# SIGS-TI PRONET

Sistema de gestión de infraestructura de TI y mesa de ayuda para controlar clientes, proyectos e incidencias con trazabilidad operativa.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/sigs-ti-pronet run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run build:render` — Render build command
- `pnpm run start:render` — production server on port 10000
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string (Neon-compatible, SSL required)
- Required env: `SESSION_SECRET` — secret used to sign session digests

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS
- Authentication: database-backed HTTP-only sessions with bcryptjs (10 rounds)

## Where things live

- `artifacts/sigs-ti-pronet/` — web app and interface
- `artifacts/api-server/` — Express API, authentication, seed, and production static serving
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/` — Drizzle schema for SIGS-TI tables
- `render.yaml` / `DEPLOYMENT.md` — Render + Neon deployment preparation

## Architecture decisions

- The frontend uses generated API hooks from the OpenAPI contract instead of hand-written request types.
- Sessions use opaque HTTP-only cookies backed by `sigs_sessions`; passwords use standard bcryptjs with 10 rounds.
- `DATABASE_URL` is read externally and normalized to require SSL for Neon-compatible connections.
- The API serves the built frontend in production so Render can run one web service and expose one permanent URL.

## Product

- Secure role-based entry for administrator, supervisor, technician, and client users.
- Dashboard with operational counts, incident distribution, and recent activity.
- CRUD flows for clients, projects, and incidents, plus a user directory.
- Seeded initial users and operational sample records for a useful first login.

## Gotchas

- Run API codegen after every OpenAPI change.
- Run `pnpm --filter @workspace/db run push` after changing Drizzle schema.
- Render requires `DATABASE_URL` and `SESSION_SECRET` to be configured in the service environment.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
