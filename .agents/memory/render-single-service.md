---
name: Render single-service build
description: Deployment constraint for serving the SIGS-TI web app and API from one Render web service.
---

When deploying SIGS-TI as one Render web service, the Node API must serve the built Vite frontend and Vite configs need safe build-time defaults when Render does not provide preview-only variables.

**Why:** Render's single web service runs one start command, while the local workspace uses separate managed frontend and API workflows.

**How to apply:** Keep the Render build/start commands aligned with the root workspace scripts and preserve the API's static frontend fallback when changing artifact routing.