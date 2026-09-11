# SIGS-TI PRONET: despliegue permanente

## GitHub

1. Crea un repositorio privado o público en GitHub.
2. Sube este repositorio conservando el `pnpm-lock.yaml`.
3. En Render, crea un **Web Service** conectado a ese repositorio.

## Neon

En Neon crea una base PostgreSQL y copia su cadena de conexión en Render como
`DATABASE_URL`. La aplicación añade `sslmode=require` cuando la URL todavía no
lo contiene y usa SSL obligatorio para la conexión.

## Render

El archivo `render.yaml` deja listos los comandos:

- Build: `pnpm install --frozen-lockfile && pnpm build`
- Start: `pnpm start:render`
- Puerto: `10000`

Configura también `SESSION_SECRET` con un valor largo y aleatorio. Al iniciar
por primera vez, el servidor crea las tablas con la migración aplicada y carga
los cuatro usuarios iniciales si `sigs_users` está vacía.

Credenciales iniciales:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@sigs-ti.test` | `Pronet2026` |
| Supervisor | `supervisor@sigs-ti.test` | `Pronet2026` |
| Técnico | `tecnico@sigs-ti.test` | `Pronet2026` |
| Cliente | `cliente@sigs-ti.test` | `Pronet2026` |

Después del primer acceso, cambia estas credenciales desde el flujo de
administración que se incorpore a la operación real.