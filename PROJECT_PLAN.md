# Time Tracker — Project Plan & Roadmap

**Owner:** accounts@dorik.com
**Created:** 2026-04-23
**Status:** Phase 1 — in progress (scaffold phase)

This document is the **single source of truth** for what is being built, what is being skipped, and what will be added later. Use this file to give future instructions. When a decision changes, update this file first.

---

## 1. What We Are Building

A **ClickUp companion time tracker** that lets any ClickUp user track time on their own ClickUp tasks from any client (web, desktop, mobile) without a browser extension.

**Core premise (revised 2026-04-27):**
- ClickUp user signs in to our app **with their ClickUp account** (OAuth, same email as ClickUp).
- On first sign-in, the app pulls every workspace → space → folder → list → task that the user has access to in ClickUp, and caches them locally.
- The timer's primary picker is a **ClickUp task picker**, not a manual project picker. The user finds the ClickUp task and starts the timer.
- Tracked time can (optionally, per entry) be pushed back to ClickUp via `POST /team/{team_id}/time_entries`, so it shows up in their normal ClickUp time-tracking views.
- The app runs anywhere — web, Tauri desktop, React Native mobile — all hitting the same REST API. The user's ClickUp tasks follow them across clients.

**This is NOT:**
- Not a browser extension (Clockify-style). All clients are full apps.
- Not a standalone time tracker with manual projects as the primary primitive — manual projects are a fallback for non-ClickUp work, not the focus.
- Not a billing / invoicing / approval system. Captured time goes back to ClickUp; downstream concerns (payroll, approvals, billable rates) are handled in ClickUp or other tools, not here.
- Not tied to any other PM tool (ClickUp only).

---

## 2. Target Users

| Role | Purpose |
|---|---|
| **Admin** | Owns the workspace in our app. Manages members, manual projects (if any), tags, and any time entry. Seeded as the first signed-up user. |
| **Member** | Regular user. Signs in with ClickUp, sees own ClickUp tasks, starts/stops timer, views own data. **Cannot edit any time-entry field.** Cannot delete entries. Cannot see other members' data. |

**Two-role model (decided 2026-04-27):** Only `admin` and `member` exist. Earlier drafts mentioned a `manager` role; that was dropped because manager and admin had identical permissions in practice — no point maintaining the distinction. Existing `manager` rows are migrated to `admin` on boot (`migrateManagerRoleToAdmin` in `server.ts`).

**Role assignment rule:** Database empty → first user = `admin`. Every signup after = `member` default. Admin can promote/demote from the Team admin panel. **No public role dropdown at signup** (security).

---

## 3. Tech Stack (Locked)

### Backend (`apps/api`)
- **Node.js 20 + Express 5**
- **TypeScript**
- **Mongoose** (MongoDB ODM)
- **Zod** (validation)
- **jsonwebtoken** (JWT — access + refresh)
- **bcryptjs** (password hash)
- **cors, helmet, morgan, dotenv**
- **socket.io** (real-time admin live-timer broadcasts)

### Frontend (`apps/web`)
- **Next.js 15 (Pages Router — not App Router)**
- **JavaScript** (matches reference `screenshot-main`)
- **Ant Design (antd) v5**
- **styled-components**
- **react-query** (data fetching)
- **axios** (HTTP)
- **date-fns + dayjs**
- **Recharts** (dashboard charts)
- **react-big-calendar** (calendar view)
- **lucide-react** (icons)
- **socket.io-client** (real-time updates from API)
- **@ant-design/plots** (extra charts)

### Shared (`packages/shared`)
- Constants, enums, role definitions
- (No TS types in shared since frontend is JS — enums + strings only)

### Database
- **MongoDB Atlas (free tier)**
- Connection string: `mongodb+srv://time-tracker:<password>@cluster0.6ypdnj9.mongodb.net/timetracker?appName=Cluster0`
- Password rotated (2026-04-23). Stored only in `apps/api/.env`.

### Deploy (later)
- API → Railway / Render / Fly.io
- Web → Vercel
- DB → MongoDB Atlas (already)

---

## 4. Monorepo Structure

```
time-tracker/
├── apps/
│   ├── api/                  # Express + TypeScript
│   └── web/                  # Next.js 15 pages router + antd (JavaScript)
├── packages/
│   └── shared/               # constants, enums
├── pnpm-workspace.yaml
├── package.json
└── PROJECT_PLAN.md           # this file
```

**Package manager:** pnpm.
**Dev mode:** localhost only initially. API `:4000`, Web `:3000`.

---

## 5. Code Conventions (Mirror of `screenshot-main`)

The reference project `D:\Dorik.io\screenshot-main` defines our frontend style. Follow it exactly.

**Folder structure inside `apps/web`:**
```
apps/web/
├── api/
│   ├── createBaseQuery.js    # axios wrapper + JWT interceptor + 401 refresh
│   ├── services/             # raw API call functions per resource
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── entries.js
│   │   └── reports.js
│   └── queries/              # react-query hooks per resource
│       ├── auth.js
│       ├── projects.js
│       ├── entries.js
│       └── reports.js
├── Components/               # PascalCase, feature grouped
│   ├── Layout/
│   ├── Timer/
│   ├── Timesheet/
│   ├── Calendar/
│   ├── Dashboard/
│   └── Reports/
├── Modals/                   # one file per modal
├── pages/                    # pages router — routes
├── hooks/                    # custom hooks (useAuth, useToast, useTimer)
├── hoc/                      # withAuth, withAdmin
├── context/                  # React context providers
├── config/                   # antd theme
├── utils/                    # persister (localStorage), consts, formatters
├── styles/                   # globals.css
├── public/
├── config.js                 # exports API_URL from env
├── jsconfig.json             # @/ alias
└── next.config.js
```

**Key patterns copied from reference:**
- `createBaseQuery.js` — axios wrapper, auto-attach JWT, refresh on 401
- `persister.js` — localStorage wrapper (`token`, `refreshToken`, auth key)
- `useAuth.js` hook — reads auth state from react-query cache + localStorage
- `withAuth.js` HOC — redirects to `/login` if not authenticated
- Services return promises; queries wrap in `useMutation` / `useQuery`
- `_app.js` providers stack: `QueryClientProvider` → `ConfigProvider` → `ThemeProvider` → `AntdApp` → page

---

## 6. Data Model

### User
```
{
  _id, email (unique), password (hashed, null if ClickUp OAuth only),
  name, role: 'admin' | 'member',
  status: 'active' | 'inactive',
  // ClickUp fields (phase 2, nullable in phase 1):
  clickupUserId, clickupTeamId, clickupAccessToken (encrypted),
  clickupConnectedAt,
  createdAt, updatedAt, lastActiveAt
}
```

### Project
```
{
  _id, name, color, description,
  clientId (Client._id, nullable),
  isPublic: true,
  tasks: [{ _id, name, status: 'active' | 'done' }],
  createdBy (User._id),
  members: [User._id],
  favoriteBy: [User._id],
  // Optional ClickUp mapping (phase 2):
  clickupListId, clickupFolderId, clickupSpaceId,
  archived: false,
  createdAt, updatedAt
}
```

### Client
```
{
  _id, name, archived: false,
  createdBy (User._id),
  createdAt, updatedAt
}
```
Used to group projects by customer / business unit.

### Tag
```
{
  _id, name, color,
  createdAt, updatedAt
}
```

### TimeEntry (atomic unit)
```
{
  _id, userId (User._id),
  projectId (Project._id, nullable — only used for non-ClickUp manual entries),
  description,
  billable: false,
  tags: [Tag._id],
  taggedUsers: [User._id],
  startTime, endTime (null if running),
  duration (seconds, derived),
  status: 'running' | 'finished',
  source:  'tracker' | 'timesheet',
  // ClickUp link (Phase 1 — primary task linkage):
  clickupTaskId, clickupTaskTitle,
  clickupListId, clickupSpaceId, clickupTeamId,
  pushedToClickup: false,
  pushedToClickupAt,
  clickupTimeEntryId,                // ID returned by ClickUp after push
  version,                           // optimistic concurrency counter
  createdAt, updatedAt
}
```

A timer entry can be linked to a ClickUp task (`clickupTaskId` set) **or** to a manual project (`projectId` set) **or** neither (free-form). ClickUp linkage is the primary path; manual projects are a fallback.

**Timesheet cell semantics (`source: 'timesheet'`):**
- One entry per `(userId, projectId, day)` — enforced by partial unique index.
- `startTime = day 00:00:00 UTC`, `endTime = startTime + duration`. No real wall time.
- Coexists with `source: 'tracker'` entries on the same day/project; matrix UI shows the **sum** of both, but cell-edit only mutates the `timesheet` row. Lowering a cell below the tracker portion returns 422.

### AuditLog (admin actions)
```
{
  _id, actorId, action, targetType, targetId,
  changes (JSON), createdAt
}
```

### ClickUpTask (cached from ClickUp API)
```
{
  _id, userId (owner — the user who synced this row),
  clickupTaskId (string, from ClickUp), clickupTeamId, clickupSpaceId,
  clickupFolderId, clickupListId,
  name, status, priority, dueDate,
  url,                                // ClickUp task URL
  assignees: [{ id, username, email, color }],
  tags: [string],
  archived: false,
  syncedAt,
  createdAt, updatedAt
}
```
Compound unique index: `(userId, clickupTaskId)`. The full sync runs on first OAuth connect and on user-initiated refresh; incremental sync runs in the background.

### TimesheetTemplate
```
{
  _id, userId, name, includeTime: false,
  rows: [Project._id],
  cells: [{ projectId, dayOffset (0-6), durationSec }],
  createdAt, updatedAt
}
```
Per-user named weekly template. Unique on `(userId, name)`. Apply via `POST /timesheet/templates/:id/apply`.

**Business rules:**
- Only one `running` entry per user. Starting a new one auto-stops the previous.
- `duration = endTime - startTime` (never stored independently for finished entries).
- `startTime < endTime` enforced server-side.
- Member cannot see other members' data (query filtered by `userId`).
- Every admin edit appended to `AuditLog`.

---

## 7. API Endpoints (Phase 1)

```
# Auth
POST   /auth/register            # public (first user → admin, else member)
POST   /auth/login               # email + password
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me

# Users (admin only)
GET    /users
POST   /users                    # invite / create
PATCH  /users/:id
DELETE /users/:id
PATCH  /users/:id/role           # promote / demote

# Projects
GET    /projects
POST   /projects                 # admin / manager
PATCH  /projects/:id             # admin / manager
DELETE /projects/:id             # admin / manager
POST   /projects/:id/tasks       # add sub-task (any auth user)
PATCH  /projects/:id/tasks/:taskId
DELETE /projects/:id/tasks/:taskId
POST   /projects/:id/favorite    # toggle favorite for current user

# Clients
GET    /clients
POST   /clients                  # admin / manager
PATCH  /clients/:id              # admin / manager
DELETE /clients/:id              # admin / manager

# Tags
GET    /tags
POST   /tags                     # any authenticated user
DELETE /tags/:id                 # admin / manager

# Time entries
GET    /entries                  # member: own only; admin: all (+filters)
POST   /entries                  # admin manual create
POST   /entries/start            # start timer (auto-stops running)
POST   /entries/stop             # stop current + require "done" confirm
PATCH  /entries/:id              # member: only { projectId }; admin: full body
DELETE /entries/:id              # admin only

# Reports
GET    /reports/summary          # totals by project / day / week
GET    /reports/detailed         # flat entry list
GET    /reports/weekly           # grid by project × day

# Calendar
GET    /calendar?from=&to=       # entries grouped by date

# Timesheet (Clockify-style weekly grid)
GET    /timesheet/matrix         # ?from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=]
                                 # rows = projects, cols = days; each cell returns
                                 # { trackerSec, timesheetSec, totalSec, timesheetEntryIds }
GET    /timesheet/projects       # active projects available to drop into a row
PUT    /timesheet/cell           # body: { projectId, day, durationSec, ... }
                                 # upsert one source:'timesheet' entry per cell;
                                 # 422 if durationSec < tracker sum on that cell
POST   /timesheet/row/delete     # body: { projectId, weekStart, weekEnd }
                                 # removes only source:'timesheet' rows; tracker preserved
POST   /timesheet/copy-week      # body: { fromWeekStart, toWeekStart }

# Timesheet templates (per-user named weekly templates)
GET    /timesheet/templates
POST   /timesheet/templates              # body: { name, includeTime, rows, cells }
DELETE /timesheet/templates/:id
POST   /timesheet/templates/:id/apply    # body: { weekStart }

# Team (real-time admin view)
GET    /team/live                        # snapshot of currently-running timers
                                         # (live updates via socket.io 'timer:started' / 'timer:stopped')

# ClickUp integration (Phase 1 — core feature, first-class)
GET    /auth/clickup                     # builds the ClickUp authorize URL and redirects
GET    /auth/clickup/callback            # token exchange + upsert User by ClickUp email
                                         # → encrypts access token, sets clickupUserId / clickupTeamId
                                         # → kicks off initial task sync
                                         # → issues our app's JWTs and redirects back to web
GET    /clickup/status                   # is the current user connected? when did they last sync?
POST   /clickup/sync                     # full re-sync of workspaces/spaces/folders/lists/tasks
                                         # body: { teamId? } (optional — defaults to all)
GET    /clickup/teams                    # list user's ClickUp workspaces (live, not cached)
GET    /clickup/tasks                    # list cached ClickUp tasks for the timer picker
                                         # query: ?q=&listId=&spaceId=&assigneeMe=true
POST   /entries/:id/push-clickup         # push a finished entry's time to ClickUp
                                         # → POST https://api.clickup.com/api/v2/team/{team_id}/time_entries
                                         # → stores returned id in TimeEntry.clickupTimeEntryId
DELETE /clickup/disconnect               # revoke and clear stored token (does not delete TimeEntry data)
```

---

## 8. UI Screens

| Route | Role | Purpose |
|---|---|---|
| `/login` | public | **"Sign in with ClickUp"** is the primary CTA. Email/password is the fallback for users who don't have a ClickUp account or want a non-OAuth admin login. |
| `/signup` | public | email/password signup (first = admin, rest = member). Most users skip this and go straight through Sign in with ClickUp. |
| `/tracker` | all | main timer bar + today's entries. Task picker is a search over cached ClickUp tasks (with manual project as fallback). |
| `/timesheet` | all | weekly grid (rows = project / ClickUp list, cols = days) |
| `/calendar` | all | month/week/day view of entries, colored by project |
| `/dashboard` | all | total time, top project / top ClickUp task, chart by day |
| `/reports` | all | Summary / Detailed / Weekly tabs + filters + export CSV/PDF |
| `/projects` | admin | CRUD manual projects (fallback for non-ClickUp work) |
| `/team` | admin | CRUD members + role promote/demote |
| `/team-live` | admin | real-time view of who's currently tracking (socket.io) |
| `/entries` | admin | global entry CRUD across all members |
| `/settings` | all | profile, password, **Connect ClickUp** (status, last-sync, manual re-sync, disconnect), default push-on-stop toggle |

---

## 9. Timer UX (req #11, #12)

**Start:**
- Click Start → no confirm, timer begins instantly.
- Task title + ClickUp task ID (if on ClickUp task context) auto-fills.
- Project dropdown (all user's projects). Required to save.
- Tag picker + teammate @mention.

**Stop:**
- Click Stop → **native browser notification** appears with a "Done" button.
- Entry is **not finalized** until user clicks Done.
- If user cancels, timer resumes.
- If user confirms Done, `endTime` set, `duration` calculated, status → `finished`.

**Running guard:**
- Only one running entry per user. Starting new auto-stops previous.

**Notifications:**
- Phase 1: browser Notification API + in-app modal fallback.
- Phase 3 (desktop): native OS notification via Tauri.

---

## 9b. Real-time (socket.io)

The API mounts a socket.io server alongside Express (`apps/api/src/socket.ts`). The web app connects via `socket.io-client` from `context/SocketContext.js`.

**Events (server → admin/manager rooms):**
- `timer:started` — emitted when any user starts a timer; payload: `{ entryId, userId, userName, userEmail, projectId, projectName, projectColor, description, startTime }`
- `timer:stopped` — emitted when an entry is finalized; payload: `{ entryId, userId, duration, stoppedAt }`

**Use cases:**
- `/team-live` page lists who is currently tracking, updated live.
- Future: push approval-status changes and notification badges.

Auth: socket handshake uses the same JWT access token as REST.

---

## 9c. ClickUp Sync & Push Flow

**On first OAuth connect:**
1. User clicks "Sign in with ClickUp" → redirected to `https://app.clickup.com/api?client_id=…&redirect_uri=…`.
2. ClickUp redirects back to `/auth/clickup/callback?code=…`.
3. Server exchanges `code` for access token at `POST https://api.clickup.com/api/v2/oauth/token`.
4. Server fetches `GET /api/v2/user` to get the ClickUp user's email + id.
5. Server upserts `User` by email — re-using an existing account if one already exists. Stores encrypted `clickupAccessToken`, `clickupUserId`, `clickupTeamId`, `clickupConnectedAt`.
6. Kicks off background sync: workspaces → spaces → folders → lists → tasks → cached as `ClickUpTask` rows scoped to that user.
7. Issues our JWT pair and redirects back to `/tracker`.

**Sync strategy:**
- First connect: full pull, all teams the user belongs to.
- User-initiated re-sync from `/settings` → `POST /clickup/sync`.
- Background incremental sync (Phase 1.5): poll every N minutes, or webhook-driven once available.

**Push time back to ClickUp (per-entry):**
- When the user stops a timer that has `clickupTaskId` set, the UI offers a "Push to ClickUp" toggle (default = on, settable per-user in `/settings`).
- If on, server calls `POST /api/v2/team/{team_id}/time_entries` with `{ start, duration, tid: clickupTaskId, description }`.
- Stores the returned ClickUp time-entry id in `TimeEntry.clickupTimeEntryId` and sets `pushedToClickup = true`.
- If push fails, the entry stays in our DB; user sees a banner and can retry via `POST /entries/:id/push-clickup`.

**Token refresh:** ClickUp OAuth tokens are long-lived (no refresh token in their flow), but if a 401 comes back from ClickUp we mark the user disconnected and prompt re-auth.

---

## 10. Permission Matrix

| Action | Admin | Member |
|---|---|---|
| Create / edit / delete member | yes | no |
| Promote / demote roles | yes | no |
| View all entries | yes | no (own only) |
| Start / stop timer | yes | yes |
| Restart finished entry | yes | yes |
| Edit any time-entry field (start / end / duration / projectId / description / tags / billable) | **yes** | no |
| Push own entry to ClickUp | yes | yes |
| Connect / disconnect own ClickUp account | yes | yes |
| Delete time entry | yes | no |
| Manage projects | yes | no |
| Manage clients | yes | no |
| Manage tags | yes | yes (create only) |

**Edit rule (decided 2026-04-27):** time-entry edit is **admin-only**. Members see entries read-only. Reason: members were making accidental edits to start/end times that broke approvals; simplest fix is to remove the edit affordance entirely instead of per-field whitelisting. Members can still create new entries (start/stop timer), restart from a finished entry, submit for approval, and view their own data.

**Enforcement (defense-in-depth):**
- **UI:** `EntryList.js` and any other entry-edit surface gate every editable control behind `useAuth().isAdmin`. Non-admin sees plain text. No edit, no delete, no popovers.
- **Server:** `PATCH /entries/:id` returns `403` for any caller whose `role !== 'admin'`. `DELETE /entries/:id` is mounted with `requireAdmin`. Same for `/projects`, `/clients`, `/tags` (delete), and `/team/live`.

---

## 11. Roadmap — Phases (revised 2026-04-27)

### Phase 1 — ClickUp-connected Time Tracker (NOW)
The whole product premise. Without this, the app has no reason to exist.

**Backend:**
- Monorepo scaffold ✅ (done)
- Express + MongoDB backend ✅
- JWT auth + first-user-is-admin ✅ (kept as fallback)
- **ClickUp OAuth app registered** at https://app.clickup.com/settings/apps
- **`GET /auth/clickup`** + **`GET /auth/clickup/callback`** — full OAuth flow, encrypted token storage
- **`POST /clickup/sync`** — full pull: teams → spaces → folders → lists → tasks → cached `ClickUpTask` rows
- **`GET /clickup/tasks`** — searchable cached list for the task picker
- **`POST /entries/:id/push-clickup`** — push finished entry to ClickUp's `time_entries` API
- Auto-push toggle in user settings

**Frontend (web):**
- `/login` — "Sign in with ClickUp" as primary CTA
- `/tracker` — task picker that searches cached ClickUp tasks (manual project picker becomes a fallback for non-ClickUp work)
- `/settings` — Connect / Disconnect ClickUp, last-sync timestamp, manual re-sync button, push-on-stop toggle
- Existing timesheet/calendar/dashboard/reports keep working with ClickUp-linked entries

**Already built and kept as supporting features:**
- Timer start/stop + done-confirm ✅
- Timesheet weekly grid ✅
- Calendar view ✅
- Reports + dashboard ✅
- Manual project CRUD (admin) — kept as a fallback path
- Admin team management ✅

### Phase 2 — Cross-platform delivery
The product runs everywhere the user is.

- **Tauri desktop app** wrapping `apps/web`. System tray timer. Native OS notifications. Offline entry queue (syncs when reconnected). Auto-update.
- **React Native mobile app** (iOS + Android). Same REST API. Lightweight task picker + timer + recent entries. Push notifications for running-timer reminders.
- One ClickUp OAuth app shared across all clients; each client stores its own JWT pair.

### Phase 3 — Polish & ClickUp depth
- Incremental sync via ClickUp webhooks (no more full re-pulls)
- Edit time entries inside ClickUp → reflect changes in our app
- Multi-workspace selector for users in many ClickUp teams
- Push back retries with exponential backoff
- CSV / PDF export of reports

### Phase 4 — Future / Optional
- SSO (SAML, Okta) for enterprise
- Other PM integrations (Jira, Linear, Asana) — only if there is real demand. Keeping ClickUp-only is the current opinion.
- Billable rates + revenue reporting (not a current goal)

**Explicitly dropped (do not re-add without a fresh decision):**
- Approval workflow (member submit → admin approve/reject)
- Notification inbox + bell
- Anything billing / invoicing / payroll-style
- Browser-extension distribution path

---

## 12. ClickUp API Reference (Verified)

All endpoints are on the public ClickUp REST API v2. No contract / partnership needed.

| Purpose | Method + URL |
|---|---|
| OAuth authorize | `GET https://app.clickup.com/api?client_id=X&redirect_uri=Y` |
| Token exchange | `POST https://api.clickup.com/api/v2/oauth/token` |
| Authorized user | `GET https://api.clickup.com/api/v2/user` |
| Workspaces (teams) | `GET https://api.clickup.com/api/v2/team` |
| Spaces | `GET https://api.clickup.com/api/v2/team/{team_id}/space` |
| Folders | `GET https://api.clickup.com/api/v2/space/{space_id}/folder` |
| Lists | `GET https://api.clickup.com/api/v2/folder/{folder_id}/list` |
| Tasks | `GET https://api.clickup.com/api/v2/list/{list_id}/task` |
| Create time entry | `POST https://api.clickup.com/api/v2/team/{team_id}/time_entries` |

**Auth header:** `Authorization: Bearer {access_token}` (OAuth) or `Authorization: {personal_token}` (personal tokens start with `pk_`).

---

## 13. Environment Variables

### `apps/api/.env`
```
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://time-tracker:<password>@cluster0.6ypdnj9.mongodb.net/timetracker?appName=Cluster0
JWT_ACCESS_SECRET=<generate>
JWT_REFRESH_SECRET=<generate>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
CORS_ORIGIN=http://localhost:3000

# Phase 2
CLICKUP_CLIENT_ID=
CLICKUP_CLIENT_SECRET=
CLICKUP_REDIRECT_URI=http://localhost:4000/auth/clickup/callback
CLICKUP_TOKEN_ENC_KEY=<32-byte base64>
```

### `apps/web/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 14. Local Dev Setup (once scaffolded)

```bash
# install
pnpm install

# backend (terminal 1)
cd apps/api
cp .env.example .env
# fill MONGODB_URI + JWT secrets
pnpm dev

# frontend (terminal 2)
cd apps/web
cp .env.example .env.local
pnpm dev

# seed first admin (optional — or just sign up first)
cd apps/api
pnpm seed:admin

# seed demo data (users + projects + entries for demo)
pnpm seed:demo
pnpm seed:demo:reset      # wipes demo data first

# one-off: backfill source='tracker' on legacy TimeEntry rows
pnpm backfill:entry-source

# one-off: convert legacy role='manager' users to role='admin'
pnpm migrate:manager-to-admin
```

> Note: `server.ts` also runs two automatic migrations on boot:
> - Backfill any TimeEntry missing `source` to `'tracker'`.
> - Convert any User with `role='manager'` to `role='admin'` (manager role was retired 2026-04-27).

---

## 15. Open Questions / TBD

- [ ] Requirement #13 in original brief was blank — user to fill in when decided
- [ ] Time push to ClickUp — confirm yes/no for phase 2
- [ ] Billable flag + hourly rates — phase 4 (skipped for now)
- [ ] Timesheet approval workflow — phase 4 (skipped for now)

---

## 16. Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-04-23 | ClickUp integration via OAuth (Option B), no browser extension | User explicitly ruled out extension. Clean API integration. |
| 2026-04-23 | First-user-is-admin rule | Public role dropdown at signup is a security risk |
| 2026-04-23 | Separate Express backend (not Next.js fullstack) | Multi-client future (web + desktop + maybe mobile). Clean REST API for all clients. |
| 2026-04-23 | Backend TypeScript, frontend JavaScript | TS for backend safety; JS frontend matches reference `screenshot-main` style |
| 2026-04-23 | Ant Design + styled-components + react-query + axios | Mirror `screenshot-main` exactly |
| 2026-04-23 | Pages Router (not App Router) | Match reference project |
| 2026-04-23 | MongoDB Atlas free tier, password rotated | Chat leak risk mitigated |
| 2026-04-27 | Add `Client` model + `/clients` endpoints | Group projects by customer / business unit (Clockify parity) |
| 2026-04-27 | Add `Notification` model + `/notifications` endpoints | In-app inbox for approval-flow events |
| 2026-04-27 | Add `TimesheetTemplate` model + `/timesheet/templates` | Per-user named weekly templates speed up timesheet entry |
| 2026-04-27 | Add `billable`, `approvalStatus`/`approvalNote`/`approvedBy`/`approvedAt`, `version` to TimeEntry | Approval workflow + optimistic concurrency |
| 2026-04-27 | Add `clientId`, `isPublic`, `tasks[]`, `favoriteBy[]` to Project | Sub-tasks, per-user favorites, client grouping |
| 2026-04-27 | Add `socket.io` + `/team/live` + `/team-live` page | Real-time admin view of who's currently tracking |
| 2026-04-27 | Add `/approvals` routes + `/approvals` page | Member-submit → admin-approve workflow |
| 2026-04-27 | Add `seed:demo`, `backfill:entry-source` scripts | Demo bootstrap + legacy TimeEntry source backfill |
| 2026-04-27 | Drop `manager` role; two-role model (admin + member) | Manager and admin had identical permission set in practice — distinction was dead weight. Existing manager rows auto-migrate to admin on boot. |
| 2026-04-27 | Time-entry edit is admin-only (UI + server) | Members were editing start/end after the fact. Removing the affordance is simpler than whitelist + audit per field. |
| 2026-04-27 | **ClickUp integration moved from Phase 2 to Phase 1.** It IS the product. | Owner clarified: the only reason this app exists is so a ClickUp user can log in with their ClickUp email and immediately track time on their ClickUp tasks from any client. Manual projects, approvals, etc. were over-built. |
| 2026-04-27 | **Approval workflow removed.** Drop `approval.*` routes/controllers, drop approval fields from `TimeEntry`, drop `Notification` model + bell. | Out of scope. Time entries are pushed to ClickUp; downstream payroll/approval is handled in ClickUp or another tool. |
| 2026-04-27 | Cross-platform (web + Tauri desktop + React Native mobile) promoted to Phase 2 | User wants the timer to follow them across platforms — same ClickUp account, same task list everywhere, no browser-extension lock-in. |
| 2026-04-27 | "Sign in with ClickUp" is the primary login CTA | Email/password is now the fallback path, not the default. |
| 2026-04-27 | Add `ClickUpTask` cache model | Task picker reads from local cache, not live ClickUp API on every keystroke. |

---

## 17. How To Use This Document

When giving instructions later:
- Reference a section by name — e.g. *"update section 6 — add a `billable` field to TimeEntry"*
- Reference a phase — e.g. *"move invoicing from phase 4 to phase 2"*
- Reference an endpoint — e.g. *"implement `POST /entries/start` now"*

When any decision changes, **update this file first** before writing code. That way future instructions always match the current plan.

---

*End of document.*
