# CIWT / Resolve — Campus Infrastructure & Work-Order Tracker

A campus complaint (issue) tracker: students and staff report infrastructure problems, administrators
turn them into work orders, technicians get deadlines and priorities, and the requester tracks the
repair until it is resolved. Bun + TypeScript + SQLite, no build step.

## Run it

    bun install
    bun run dev        # http://localhost:3000
    bun test           # workflow and SQLite persistence tests

Tests cover issue/work-order status transitions, ownership checks, rejected requests leaving data unchanged,
and saving/reloading records through a separate temporary SQLite database. They do not use or modify the
project's `ciwt.db`. GitHub Actions runs `bun test` on pushes and pull requests.



**Database:** SQLite (`bun:sqlite`, built into Bun — nothing to install). On first start the server creates
`ciwt.db` and fills it with demo data (1 admin, 3 users, 127 issues, 65 work orders). Every change is saved
to `ciwt.db`, so records survive restarts and logouts. To start over, stop the server and delete `ciwt.db`.
To back up, copy `ciwt.db`. Uploaded photos are stored in `uploads/`.

## Modules implemented

| Module | What works | Where |
|---|---|---|
| Authentication & roles | Login/logout, Argon2id hashes, HttpOnly session cookie, 30-min idle timeout, END_USER vs ADMINISTRATOR gates | `server.ts` |
| Issue reporting | Multipart form with title, category, location, description, privacy acknowledgement and up to 3 validated JPEG/PNG photos (≤5 MB each) | `server.ts`, `services.ts` |
| Tracking & detail | Issue list, search by ID/title, status/category/priority filters, detail view with submitter, photos, work order and progress history | `public/index.html` |
| Work orders | Create from an OPEN issue, assignment type, assignee, priority, deadline; edit work details, priority, deadline and assignee; append progress notes | `services.ts`, `public/index.html` |
| Work-order queue (ADM-01) | Admin search by ID/issue/details/assignee plus status (incl. **Overdue**), priority and assignment-type filters | `public/index.html` |
| Lifecycle | OPEN → IN_PROGRESS → RESOLVED, or OPEN → CLOSED with feedback; illegal transitions rejected with 400 | `services.ts` |
| Notifications | In-app notification per assignment, update, close; read/unread state per user | `server.ts`, `public/index.html` |
| User management | Admin adds and edits users (name, email, password, role); duplicate email → 409; last administrator cannot be demoted → 409 | `services.ts`, `public/index.html` |
| Dashboard | Totals by status and category, active-issue ratio, overdue count, unassigned count, recent issues | `server.ts` |
| Persistence | Full schema with FK/CHECK constraints and indexes; load on start, save in one transaction after each successful change | `persist.ts` |

## Technology stack and why

- **Bun runtime** — one dependency-free toolchain: HTTP server (`Bun.serve`), SQLite (`bun:sqlite`), Argon2id
  password hashing (`Bun.password`), test runner (`bun test`) and TypeScript execution. No build, no Docker,
  no separate database server, so the demo runs with two commands on any laptop.
- **TypeScript** — typed domain models (`Issue`, `WorkOrder`, `Progress`, `Photo`, `Notification`, `UserRec`)
  that mirror the SRS class diagram, plus small typed HTTP helpers.
- **Zod** — one declarative schema per request body, so validation messages are consistent and the API
  contract is readable in code.
- **SQLite** — a real relational schema with constraints and indexes, but a single file to submit and back up.
- **Vanilla JS single-page UI + Tailwind (CDN)** — hash routing and one `render()` function; no bundler,
  no framework version drift, and every screen is still plain HTML that can be inspected in the browser.

## Frontend ↔ backend

The browser never talks to the database. `public/index.html` calls `/api/*` with `fetch`, JSON in and out
(multipart only for issue creation with photos); the session cookie rides along automatically. On load the UI
calls `GET /api/bootstrap`, which returns this user's issues, photos, work orders, progress updates,
notifications and (for admins) users in a single round trip; that response hydrates the client-side `S` store,
and every view is rendered from `S`. Mutations send a request, then refresh the affected slice and re-render;
the server's `{ error }` message is shown as a toast. Hash routes (`#/issues`, `#/wos/I-014`, …) keep the app
navigable without a router library.

## Project structure

| Path | Role | Lines |
|---|---|---|
| `persist.ts` | SQLite schema, load on start, transactional save | 66 |
| `store.ts` | domain types, in-memory working store, ID sequences, demo seed | 85 |
| `services.ts` | business rules and status transitions | 72 |
| `server.ts` | HTTP routes, sessions, CSRF origin check, Zod validation, photo storage | 164 |
| `tests/transitions.test.ts` | issue/work-order transition, ownership and rejected-request tests | — |
| `tests/persistence.test.ts` | SQLite save/load and restart tests using a temporary database | — |
| `public/index.html` | the Resolve UI, talking to `/api/*` | 235 |
| `CIWT-Project-Guide.pdf` | full project report: architecture, SRS mapping, viva Q&A | — |

## SRS coverage

Implemented: issue reporting with photos, role-based access, work-order assignment and editing (ADM-01
search/filter, ADM-05 work details), closure with feedback, requester resolution, notifications, admin user
management, dashboard metrics, persistence and input validation.

Known deviations, documented rather than hidden: no separate `Pending` work-order state (assignment goes
straight to `ASSIGNED`), no immutable status-history table (progress notes carry the audit trail), and the
dashboard's "Active Issues" tile is labelled as a ratio rather than "pending issues".

## Configuration

`SESSION_SECRET` (otherwise a random per-boot secret), `UPLOAD_DIR` (default `./uploads`), `PORT` (3000),
`DB_FILE` (default `ciwt.db`). Set `NODE_ENV=production` behind HTTPS so the session cookie is marked `Secure`.


