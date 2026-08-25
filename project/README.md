# LockIn

LockIn is a collaborative project-management and focused-work application built with Next.js App Router. It combines responsive Kanban boards, task collaboration, role-based project access, calendar and analytics views, notifications, and tracked focus sessions in one workspace.

This `project/` directory is the application root.

## Implemented features

### Projects and tasks

- Create, edit, and delete projects with shareable project slugs and due dates.
- Organize work in Kanban lists and move tasks with `@dnd-kit` drag and drop.
- Use a responsive single-column board with locally scrollable status tabs on mobile.
- Create, edit, move, complete, and delete tasks with descriptions, priorities, labels, due dates, and assignees.
- Open task details for comments, mentions, activity history, assignment, status changes, and focus-session controls.
- Select multiple tasks to move or delete them in bulk.
- Mark one list per project as the semantic completed state so completion metrics do not depend on a list name.

### Collaboration and access control

- Invite users to projects and manage active members and pending invitations.
- Assign a permission level independently from a descriptive project role or job title.
- Enforce project capabilities in both the interface and authenticated server actions.
- Synchronize project activity, board updates, presence, and notifications with Pusher.
- Configure notification categories, temporary muting, and focus-mode muting.

### Planning and productivity

- Review dashboard totals and accessible projects.
- Explore analytics for 7 days, 30 days, the current month, or all time, including completion trends, task status, workload, deadline health, and focus summaries.
- View dated tasks in Month or Week calendar views and review upcoming deadlines across accessible projects.
- Preview a calendar task before opening its complete task details.
- Start tracked LockIn sessions from tasks with silence, white noise, or focus-music modes.
- Search across the application and switch between light and dark themes.
- Use route-level and component-level skeletons for asynchronous screens and dialogs.

## Project permissions

Project access is capability-based. The server resolves an effective permission for every project operation; hiding a control in the UI is not the only authorization layer.

| Permission | Access |
| --- | --- |
| Owner | Full project access, including members, columns, settings, and project deletion. |
| Admin | Manage tasks, columns, members, and project settings; cannot delete the project. |
| Member | Create, edit, move, complete, and comment on tasks; cannot manage members, columns, or project settings. |
| Viewer | Read-only access to the project and task details. |

The separate **Project Role / Job Title** field is descriptive and does not grant permissions. Non-owners may leave a project; owners cannot use the member leave-project action.

## Main application areas

| Route | Purpose |
| --- | --- |
| `/dashboard` | Workspace totals, quick actions, and project overview |
| `/projects` | Accessible project collection |
| `/projects/[slug]` | Responsive Kanban board and project management dialogs |
| `/team` | Membership, invitation, role, and permission management |
| `/analytics` | Range-aware task, deadline, workload, and focus metrics |
| `/calendar` | Month/Week due-date calendar and upcoming deadlines |
| `/settings` | Account, appearance, notification, and security settings |

All dashboard routes require Clerk authentication. The landing page and authentication routes remain public.

## Architecture and tech stack

| Area | Implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 semantic tokens, Framer Motion, Lucide icons, Radix UI primitives |
| Authentication | Clerk middleware, hosted authentication UI, and Svix-verified Clerk webhooks |
| Database | PostgreSQL with Neon serverless and Drizzle ORM |
| Server layer | React Server Components, Server Actions, route handlers, and capability guards |
| Client state | Zustand stores for board, focus-session, and modal/UI state |
| Realtime | Pusher private/presence channels for collaboration and notifications |
| Board | `@dnd-kit/core` and `@dnd-kit/sortable` |
| Calendar | React Big Calendar with `date-fns` localizing and LockIn-specific rendering |
| Validation | Zod schemas and typed task/project DTOs |
| Testing | Vitest, Testing Library, Playwright, and Clerk testing helpers |
| Tooling | pnpm 10.10, Biome, Drizzle Kit, and TypeScript |

Key directories:

```text
project/
├── app/                 # Routes, layouts, loading UI, Server Actions, and APIs
├── components/          # Kanban, calendar, analytics, dialogs, and shared UI
├── hooks/               # Realtime, responsive, calendar, and project hooks
├── lib/                 # Database, permissions, task rules, and Pusher integration
├── stores/              # Zustand board, focus, and UI state
├── utils/               # Validation, date-only, and presentation utilities
├── e2e/                 # Playwright workflows
└── public/              # Branding and focus-session audio assets
```

Database migrations used by the current Drizzle configuration are stored under `lib/db/migrations/`.

## Local setup

### Prerequisites

- Node.js 20 or newer
- pnpm 10.10.x
- A PostgreSQL database, such as Neon
- A Clerk application
- A Pusher Channels application for realtime collaboration

### Install and run

```bash
git clone <repository-url>
cd nextjs-internship-capstone/project
pnpm install
cp .env.example .env.local
```

Add the environment values described below, then apply the committed database migrations:

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Never commit `.env.local`. The application reads these variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection used by the application and Drizzle Kit |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server and test-runner key |
| `CLERK_WEBHOOK_SECRET` | Verifies Clerk user lifecycle webhooks with Svix |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route, normally `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route, normally `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-sign-in route, normally `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-sign-up route, normally `/dashboard` |
| `PUSHER_APP_ID` | Pusher server application ID |
| `NEXT_PUBLIC_PUSHER_KEY` | Shared Pusher client/server key |
| `PUSHER_SECRET` | Pusher server secret |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster, such as `mt1` |

Configure the Clerk webhook endpoint as `/api/webhooks/clerk` and subscribe to `user.created`, `user.updated`, and `user.deleted` so Clerk profiles stay synchronized with the application database. Realtime code has development-safe placeholder values, but collaboration, presence, and realtime notifications require valid Pusher credentials.

## Commands

Run commands from `project/`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm check` | Run Biome checks |
| `pnpm format` | Format supported files with Biome |
| `pnpm type-check` | Run TypeScript without emitting files |
| `pnpm test` | Run component and backend Vitest suites |
| `pnpm test:coverage` | Run Vitest with V8 coverage |
| `pnpm test:e2e` | Build the app and run Playwright end-to-end tests |
| `pnpm db:generate` | Generate Drizzle migrations from the schema |
| `pnpm db:migrate` | Apply pending Drizzle migrations |

Recommended pre-commit validation:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
```

Playwright setup creates or updates two deterministic Clerk test users and writes authenticated browser state under `playwright/.auth/`. Run E2E tests only against non-production Clerk and database resources.

## Important behavior and limitations

- Task due dates are date-only values. Calendar and deadline views preserve the stored calendar date instead of applying timezone-dependent timestamp conversion.
- A project can have at most one semantically completed list. Analytics and completion state use that flag rather than names such as `Done` or `Complete`.
- Kanban custom column colors are stored in the current browser. Calendar events intentionally use the shared default status-color semantics and do not read those browser-specific overrides.
- Desktop boards own their horizontal scrolling; the mobile board shows one active column and keeps status-tab scrolling local so the page does not overflow horizontally.
- Loading, empty, error, and success states are distinct. Route skeletons cover the async dashboard, projects, Kanban, team, analytics, and calendar screens, while dialogs use local loading states where needed.

## Deployment notes

Deploy `project/` as the application root with Node.js 20+ and pnpm. Configure all production environment variables, apply database migrations before serving the release, and point the Clerk webhook to the deployed `/api/webhooks/clerk` URL. Pusher client and server credentials must belong to the same application and cluster.

## Audio credits

Focus-session audio is sourced from Pixabay under the [Pixabay Content License](https://pixabay.com/service/license/). Focus music is by [kaazoom](https://pixabay.com/users/kaazoom-448850/), and the noise track is by [Cosmic Scapes](https://pixabay.com/users/cosmic-scapes-48503009/).

## Repository context

LockIn began as a Stratpoint Engineering Internship capstone. Historical planning and learning materials remain under [`docs/`](../docs/) and [`tasks/`](../tasks/); this README describes the current implemented application rather than the original project plan.
