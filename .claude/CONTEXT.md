# Kaneo Codebase Context

Reference document for future Claude Code sessions on this project.

---

## Project Structure

Pnpm monorepo managed by TurboRepo.

```
kaneo/
├── apps/
│   ├── api/          # Hono backend on port 1337
│   ├── web/          # React/Vite frontend on port 5173
│   └── docs/         # Next.js docs
├── packages/
│   ├── libs/         # Shared: typed Hono RPC client, API URL resolver
│   └── typescript-config/
├── i18n/             # Translation files (NOT inside apps/web)
│   ├── en-US.json    # Source of truth — add new keys here first
│   └── resources.ts  # Imports all locales, exposes `resources` object
└── charts/           # Helm charts
```

---

## Technology Stack

| Layer | Tech |
|-------|------|
| Backend | Hono (TypeScript), PostgreSQL, Drizzle ORM |
| Auth | Better Auth (`authClient` on frontend, `c.get("userId")` in handlers) |
| Validation | Valibot (backend), Zod (Better Auth internals) |
| Frontend | React 19, Vite, TanStack Router (file-based), TanStack Query |
| Styling | Tailwind CSS v4 |
| State | Zustand (UI), TanStack Query (server state) |
| UI Primitives | Base UI (via coss skill — see `.claude/skills/coss/SKILL.md`) |
| i18n | i18next + react-i18next, namespace-based keys |
| IDs | CUID2 via `@paralleldrive/cuid2` |
| Linting | Biome (`pnpm lint` to auto-fix) |

---

## Backend Patterns

### Adding an Endpoint

1. Create controller in `apps/api/src/{feature}/controllers/{name}.ts`
2. Add route to `apps/api/src/{feature}/index.ts` using `describeRoute` + `validator`
3. Use `workspaceAccess.fromParam("workspaceId")` middleware for workspace-scoped routes
4. Use `requireWorkspacePermission(...)` for write operations
5. Hono context: `c.get("userId")`, `c.get("workspaceId")`

### Database

- Schema: `apps/api/src/database/schema.ts`
- Relations: `apps/api/src/database/relations.ts`
- Migrations: auto-run on API startup (`apps/api/drizzle/`)
- All IDs: CUID2 (`createId()`)
- All tables: `createdAt`, `updatedAt` timestamps
- Foreign keys: always specify `onDelete`/`onUpdate` cascade behavior
- Indexes: always add on FK columns

### Key Tables

| Table | Purpose |
|-------|---------|
| `userTable` | Users (id, name, email, image) |
| `workspaceTable` | Workspaces/organizations |
| `workspaceUserTable` | Workspace membership (userId, workspaceId, role) |
| `projectTable` | Projects (workspaceId FK) |
| `columnTable` | Kanban columns (projectId FK, slug used as status) |
| `taskTable` | Tasks (projectId FK, userId FK = assignee, status = column slug) |
| `activityTable` | Activity/comments on tasks |
| `labelTable` | Task labels (taskId FK) |
| `timeEntryTable` | Time tracking entries |
| `notificationTable` | User notifications |

### Task Status

Task `status` field matches column `slug` values (e.g. "to-do", "in-progress", "done"). Special statuses: `"planned"` (backlog), `"archived"`.

---

## Frontend Patterns

### Data Layer

```
API endpoint → fetcher → query/mutation hook → component
```

- **Fetchers**: `apps/web/src/fetchers/{feature}/{action}.ts`
  - Use typed Hono RPC client: `import { client } from "@kaneo/libs"`
  - Path follows Hono route structure: `client.workspace[":workspaceId"].members.$get({ param: { workspaceId } })`
- **Query hooks**: `apps/web/src/hooks/queries/{feature}/use-{name}.ts`
  - Use `useQuery` from TanStack Query
  - Query key: `["{feature}", param]`
  - `refetchInterval: 30000` for live data
- **Mutation hooks**: `apps/web/src/hooks/mutations/{feature}/use-{action}.ts`
  - Invalidate relevant queries in `onSuccess`

### Routing

File-based routing via TanStack Router. Route files in `apps/web/src/routes/`.

Key route tree:
```
__root.tsx                              # Root with QueryClient context
_layout.tsx                             # App shell (CommandPalette)
_layout/_authenticated.tsx              # Auth guard (session check → redirect)
_layout/_authenticated/dashboard/
  workspace/$workspaceId.tsx            # Workspace layout
  workspace/$workspaceId/
    index.tsx                           # Workspace home
    members.tsx                         # Team members page
    users.tsx                           # Users view (task assignments)
    project/$projectId/
      board.tsx                         # Kanban board
      backlog.tsx                       # Backlog list
      gantt.tsx                         # Gantt timeline
```

### Layout Components

- `WorkspaceLayout` (`components/common/workspace-layout.tsx`): breadcrumb header + content area. Use for workspace-level pages.
- `ProjectLayout` (`components/common/project-layout.tsx`): project header + view switcher (Backlog/Board/Gantt). Use for project-level pages.
- `Layout` (`components/common/layout.tsx`): base layout with `Layout.Header` / `Layout.Content` slots.

### Navigation

Sidebar nav items are in `components/nav-main.tsx`. Add new workspace-level pages to the `navItems` array.

### i18n

- Source file: `i18n/en-US.json` (root, not inside apps)
- Namespace = top-level JSON key (e.g. `"users"`, `"navigation"`, `"tasks"`)
- Usage in components: `const { t } = useTranslation(); t("namespace:key.path")`
- Keys are auto-registered from `Object.keys(resources["en-US"])` — no manual namespace registration needed
- `_other` suffix for plurals: `"taskCount": "{{count}} task"` + `"taskCount_other": "{{count}} tasks"`

### UI Components (coss)

See `.claude/skills/coss/SKILL.md` for the full component guide. Key imports:
```typescript
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
```

### Task Types

`Task` type (`apps/web/src/types/task/index.ts`):
```typescript
type Task = {
  id: string; title: string; number: number | null;
  description: string | null; status: string; priority: string | null;
  startDate: string | null; dueDate: string | null; position: number | null;
  createdAt: string; userId: string | null; assigneeId: string | null;
  assigneeName: string | null; assigneeImage?: string | null; projectId: string;
  columnId?: string | null; labels?: TaskLabel[]; externalLinks?: TaskExternalLink[];
};
```

### Gantt Components

- `GanttTaskBar` (`components/gantt/gantt-task-bar.tsx`): renders draggable task bars
  - Takes `task: Task & { scheduleStart: Date; scheduleEnd: Date }` + `timeline` object + `pixelsPerDay`
  - Internally uses `useUpdateTask` for date persistence on drag
  - The `timeline` object: `{ days: Date[], rangeStart: Date, gridTemplateColumns: string }`
  - `pixelsPerDay` computed via `ResizeObserver` on a ref element

The per-project Gantt logic in `routes/.../gantt.tsx` can be copied/adapted for cross-project views.

---

## Key Features Implemented

| Feature | Route | Notes |
|---------|-------|-------|
| Kanban Board | `project/$projectId/board` | Drag-drop via @dnd-kit |
| Backlog | `project/$projectId/backlog` | Unscheduled/planned tasks |
| Gantt (per project) | `project/$projectId/gantt` | Timeline with draggable bars |
| Members | `workspace/$workspaceId/members` | Invite + ghost users |
| **Users View** | `workspace/$workspaceId/users` | Cross-project task view grouped by user, List + Gantt toggle |
| Search | `workspace/$workspaceId/search` | Global search via `/api/search` |
| Time Tracking | (sheet) | Time entries per task |
| Notifications | (dropdown) | Real-time + email notifications |
| OIDC/SSO | Auth flow | Multiple providers via Better Auth |
| Ghost Users | (modal in Members) | Create users without email invite |
| GitHub/Gitea | Integration | Issue sync |
| Slack/Discord/Telegram | Integration | Event webhooks |

---

## API Endpoint Reference

Base URL: `/api`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspace/:workspaceId/members` | List workspace members |
| GET | `/workspace/:workspaceId/tasks-by-user` | All assigned tasks grouped by user |
| POST | `/workspace/:workspaceId/ghost-users` | Create user without invitation |
| GET | `/task/tasks/:projectId` | Tasks for a project (supports filters) |
| PUT | `/task/assignee/:id` | Update task assignee |
| GET | `/search` | Global cross-workspace search |
| GET | `/project/:workspaceId` | Projects in workspace |

---

## Typed RPC Client

The `client` from `@kaneo/libs` is a fully typed Hono RPC client generated from `AppType` in `apps/api/src/index.ts`. Adding new Hono routes automatically adds type-safe client methods. No manual type updates needed.

Path encoding:
- Route param `/:workspaceId/tasks-by-user` → `client.workspace[":workspaceId"]["tasks-by-user"].$get(...)`
- Route param `/:id` → `client.task[":id"].$put(...)`

---

## Development Commands

```bash
pnpm dev                          # Start API (1337) + Web (5173)
pnpm lint                         # Biome lint + auto-fix
pnpm build                        # Full monorepo build (runs pre-commit hook)
pnpm --filter @kaneo/api db:generate   # Generate DB migration after schema change
pnpm --filter @kaneo/api db:studio     # Open Drizzle Studio GUI
```

---

## Notes & Gotchas

- **Package manager**: pnpm only (pinned to 10.32.1). Never use npm/yarn.
- **Pre-commit hook**: runs `biome ci .` + `pnpm build` — commits are slow by design.
- **Environment**: single `.env` at repo root, shared by all apps.
- **Task status** uses column `slug` as its value — "to-do", "in-progress", etc. Check `columnTable` for the actual values.
- **Better Auth** handles workspace membership via `authClient.organization.*` — workspace = organization in Better Auth terms.
- **Task assignee**: `taskTable.userId` is the assignee FK. Separate from `activityTable.userId` (who performed the action).
- **Ghost users**: workspace members created without email verification — they exist in `userTable` and `workspaceUserTable` but can't log in normally.
- **Timestamps** in DB are `Date` objects; API serializes them as ISO strings. Frontend parses with `parseISO` from `date-fns`.
