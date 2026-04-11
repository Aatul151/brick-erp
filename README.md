# Brick ERP

**Brick ERP** is a multi-tenant ERP foundation: users, roles, tenants, audit, and related admin capabilities, with **Form Studio** included so you can extend the product per tenant while keeping isolation and a shared UI. **Frontend:** React (Vite). **Backend:** Node.js (Express).

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Express, Drizzle ORM, PostgreSQL
- **Auth:** JWT, bcrypt

## Setup

1. Copy `.env.example` to `.env` and fill in your values.
2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Database schema:** from `backend`, run `npm run push` when Drizzle schema changes (uses `../.env`). This can prompt for confirmation; it is **not** part of `npm start` so the API always boots.
4. Run backend: `cd backend && npm run dev` (hot reload) or `npm start` (plain `node server.js`). Optional one-shot: `npm run start:with-db-push` runs `push` then the server.
5. Run frontend: `cd frontend && npm run dev`

## Adding a new app (module)

Use one **resource slug** in `snake_case` (for example `inventory`). That slug is used for permissions, the **Modules** admin UI, and (by convention) URLs like `/inventory` unless you override the path in the sidebar fallback.

### Backend

1. Add a folder under `backend/apps/<your-app>/` (routes, controllers, models—mirror `backend/apps/form-studio/` if you need HTTP APIs and Drizzle tables).
2. Register routes in `backend/server.js` (for example `app.use('/api', yourAppRoutes)`).
3. If you add tables, export schema from `backend/models/schemaIndex.js` and run migrations as you do for the rest of the project.
4. Register the module and permissions in `backend/seeds/seedData.js`: a row in **modules** (`name`, `slug`, `icon`, `sortOrder`) and **permissions** for that `resourceName` (`menu`, `read`, `create`, `update`, `delete` as needed). Assign those permissions to the roles that should access the app (same patterns as `form_studio` in the seed file).

### Frontend

1. **Pages:** `frontend/src/pages/apps/<your-app>/` (route-level screens).
2. **Components:** `frontend/src/components/<your-app>/` when the UI is not shared with `common` / `layout` / `ui`.
3. **Optional utils:** `frontend/src/utils/<your-app>/` for app-specific helpers.
4. **`frontend/src/utils/resources.js`:** add a constant on `RESOURCE` (for example `INVENTORY: 'inventory'`) matching the backend `resourceName`.
5. **`frontend/src/App.jsx`:** import your page components and append entries to `PROTECTED_ROUTES` with `path`, `component`, and optional `permission` (`resource` + `action`) and `roles`—same pattern as existing core and Form Studio routes.
6. **`frontend/src/components/layout/Sidebar.jsx`:** add an entry to `FALLBACK_ITEMS` (name, path, slug, icon key, roles). If the app should sit at the **top** of the drawer next to Form Studio, add its slug to `ROOT_LEVEL_APPS`; otherwise add the slug to the appropriate `MENU_GROUPS[].slugs` list. Register the **icon string** in `ICON_MAP` if it is not already there.
7. **`frontend/src/utils/navigation/breadcrumbConfig.js`:** extend `ROUTE_LABELS` (and any custom `path.startsWith` branches) if you need breadcrumbs for the new paths.

**Form Studio** stays as the built-in app; new apps are added **alongside** it using the same permission and routing patterns.
