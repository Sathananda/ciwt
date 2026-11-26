/* SQLite persistence (bun:sqlite is built into Bun: no install, no server). The working data lives in the
   in-memory store; after every successful change it is written to ciwt.db in one transaction, and it is
   loaded back when the server starts, so saved records survive restarts (NFR-REL-01). */
import { Database } from "bun:sqlite";
import { db } from "./store";

const SCHEMA = `
create table if not exists users(user_id text primary key, name text not null, email text unique not null, password_hash text not null,
  role text not null check(role in ('END_USER','ADMINISTRATOR')));
create table if not exists issues(issue_id text primary key, user_id text not null references users, title text not null check(length(title) between 1 and 100),
  description text not null check(length(description) between 1 and 500),
  category text not null check(category in ('ELECTRICAL','PLUMBING','FURNITURE','CLEANING','NETWORK','OTHERS')), location text not null,
  status text not null check(status in ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')), closure_feedback text, submitted_at text not null);
create table if not exists issue_photos(photo_id text primary key, issue_id text not null references issues, file_name text not null, file_path text not null);
create table if not exists work_orders(work_order_id text primary key, issue_id text not null unique references issues, work_details text not null,
  assignment_type text not null check(assignment_type in ('INTERNAL','EXTERNAL')), assigned_person_name text,
  priority text not null check(priority in ('LOW','MEDIUM','HIGH','CRITICAL')), deadline text not null,
  status text not null check(status in ('ASSIGNED','RESOLVED')), resolution_note text, created_at text not null, updated_at text not null,
  check(status <> 'RESOLVED' or resolution_note is not null));
create table if not exists progress_updates(update_id text primary key, work_order_id text not null references work_orders, description text not null, updated_at text not null);
create table if not exists notifications(notification_id text primary key, user_id text not null references users, issue_id text not null references issues,
  message text not null, is_read integer not null default 0, created_at text not null);
create table if not exists meta(key text primary key, value integer not null);
create index if not exists ix_issues_user_status on issues(user_id, status);
create index if not exists ix_wo_deadline_status on work_orders(deadline, status);
create index if not exists ix_notes_user on notifications(user_id, is_read);`;

const TABLES: [string, keyof typeof db, string[]][] = [   // parents first
  ["users", "users", ["user_id", "name", "email", "password_hash", "role"]],
  ["issues", "issues", ["issue_id", "user_id", "title", "description", "category", "location", "status", "closure_feedback", "submitted_at"]],
  ["issue_photos", "photos", ["photo_id", "issue_id", "file_name", "file_path"]],
  ["work_orders", "wos", ["work_order_id", "issue_id", "work_details", "assignment_type", "assigned_person_name", "priority", "deadline", "status", "resolution_note", "created_at", "updated_at"]],
  ["progress_updates", "updates", ["update_id", "work_order_id", "description", "updated_at"]],
  ["notifications", "notes", ["notification_id", "user_id", "issue_id", "message", "is_read", "created_at"]],
];
const DATES = ["submitted_at", "created_at", "updated_at"];
let sqlite: Database | undefined;

export function openDb(file = process.env.DB_FILE ?? "ciwt.db") {
  sqlite = new Database(file, { create: true });
  sqlite.exec("pragma journal_mode=wal; pragma foreign_keys=on;");
  sqlite.exec(SCHEMA);
}
export function closeDb() {
  sqlite?.close();
  sqlite = undefined;
}
/** Fill the in-memory store from the file. Returns false when the database is empty (first run). */
export function load(): boolean {
  if (!sqlite) throw new Error("Database is not open");
  if (!(sqlite.query("select count(*) n from users").get() as any).n) return false;
  for (const [t, k] of TABLES) (db[k] as any[]).push(...sqlite.query(`select * from ${t}`).all().map((r: any) => {
    for (const c of DATES) if (c in r) r[c] = new Date(r[c]);
    if ("is_read" in r) r.is_read = !!r.is_read;
    return r;
  }));
  for (const m of sqlite.query("select * from meta").all() as any[]) (db as any)[m.key] = m.value;
  return true;
}
/** Write everything in a single transaction (all-or-nothing). */
export function save() {
  if (!sqlite) throw new Error("Database is not open");
  sqlite.transaction(() => {
    for (const [t] of [...TABLES].reverse()) sqlite.exec(`delete from ${t}`);
    for (const [t, k, cols] of TABLES) {
      const st = sqlite.prepare(`insert into ${t}(${cols.join(",")}) values(${cols.map(() => "?").join(",")})`);
      for (const r of db[k] as any[]) st.run(...cols.map(c => r[c] instanceof Date ? r[c].toISOString() : typeof r[c] === "boolean" ? +r[c] : r[c] ?? null));
    }
    sqlite.exec("delete from meta");
    for (const k of ["iseq", "wseq"] as const) sqlite.prepare("insert into meta values(?,?)").run(k, db[k]);
  })();
}
