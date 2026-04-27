# Time Tracker

Standalone SaaS time tracker that integrates with ClickUp via OAuth.

Includes a **Clockify-style weekly Timesheet** (editable matrix of project × day cells, copy-from-previous-week, totals row) layered on top of the live timer — see `/timesheet` in the web app and the `/timesheet/*` API routes.

See **`PROJECT_PLAN.md`** for full spec, roadmap, data model, API endpoints, and decisions log.

## Structure

```
time-tracker/
├── apps/
│   ├── api/          Express + TypeScript + Mongoose
│   └── web/          Next.js 15 + JavaScript (pages router) + antd
├── packages/
│   └── shared/       Shared constants and enums
├── pnpm-workspace.yaml
└── PROJECT_PLAN.md
```

## Quick start

```bash
# install all workspaces
pnpm install

# copy env templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# fill in MONGODB_URI, JWT secrets

# run both in parallel
pnpm dev

# or individually
pnpm dev:api   # port 4000
pnpm dev:web   # port 3000

# seed first admin
pnpm seed:admin
```

## Requirements

- Node.js 20+
- pnpm 9+
- MongoDB Atlas account (free tier)
