import { z } from "zod";
import { join } from "node:path";
import { HttpError, need, svc, woOf, type User } from "./services";
import { db, seed, today, publicUser } from "./store";
import { openDb, load, save } from "./persist";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads", SECRET = process.env.SESSION_SECRET || crypto.randomUUID(), PROD = process.env.NODE_ENV === "production";

/* ---- storage abstraction (swap for S3 later) ---- */
interface StorageProvider { put(name: string, data: Uint8Array): Promise<void>; get(name: string): Blob }
const storage: StorageProvider = { put: async (n, d) => { await Bun.write(join(UPLOAD_DIR, n), d); }, get: n => Bun.file(join(UPLOAD_DIR, n)) };

const parse = <T extends z.ZodTypeAny>(s: T, d: unknown): z.infer<T> => {
  const r = s.safeParse(d); if (!r.success) throw new HttpError(400, r.error.issues.map(i => `${i.path.join(".") || "request"}: ${i.message}`).join("; ")); return r.data; };
const json = (d: unknown, s = 200, h: HeadersInit = {}) => Response.json(d, { status: s, headers: h });
const IDLE_MS = 30 * 60 * 1000;
const th = (t: string) => new Bun.CryptoHasher("sha256").update(SECRET + t).digest("hex");
const cookie = (t: string, age: number) => `sid=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${PROD ? "; Secure" : ""}`;
/** The session token from the request cookie (the cookie store is HttpOnly, so JS never sees it). */
const sid = (req: Request) => req.headers.get("cookie")?.match(/(?:^|; )sid=([^;]+)/)?.[1] ?? null;

const CATS = ["ELECTRICAL", "PLUMBING", "FURNITURE", "CLEANING", "NETWORK", "OTHERS"] as const;
const PRI = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const, STAT = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

/* ---- auth: sliding 30-minute idle session (held in memory) ---- */
function auth(req: Request): User | null {
  const tok = sid(req); if (!tok) return null;
  const id = th(tok), s = db.sessions.get(id), now = Date.now();
  if (!s || s.expires < now || now - s.last > IDLE_MS) { db.sessions.delete(id); return null; }
  s.last = now; const u = db.users.find(x => x.user_id === s.user_id); return u ? publicUser(u) : null;
}

/* ---- validation ---- */
const Login = z.object({ email: z.string().email(), password: z.string().min(1) });
const IssueIn = z.object({ title: z.string().trim().min(1, "required").max(100), category: z.enum(CATS), location: z.string().trim().min(1, "required").max(200),
  description: z.string().trim().min(1, "required").max(500), ack: z.literal("true", { errorMap: () => ({ message: "privacy notice must be acknowledged" }) }) });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const WOIn = z.object({ work_details: z.string().trim().min(1), assignment_type: z.enum(["INTERNAL", "EXTERNAL"]), assigned_person_name: z.string().trim().max(100).optional(), priority: z.enum(PRI), deadline: date });
const WOUp = z.object({ work_details: z.string().trim().min(1).max(500).optional(), priority: z.enum(PRI).optional(), deadline: date.optional(), assigned_person_name: z.string().trim().max(100).optional(), progress: z.string().trim().min(1).max(1000).optional() });
const UserIn = z.object({ name: z.string().trim().min(1, "required").max(100), email: z.string().trim().email(),
  password: z.string().min(8, "use at least 8 characters").max(128), role: z.enum(["END_USER", "ADMINISTRATOR"]).default("END_USER") });
const UserUp = z.object({ name: z.string().trim().min(1, "required").max(100).optional(), email: z.string().trim().email().optional(),
  password: z.string().min(8, "use at least 8 characters").max(128).optional(), role: z.enum(["END_USER", "ADMINISTRATOR"]).optional() });

async function savePhotos(files: File[]) {
  need(files.length <= 3, 400, "photos: a maximum of 3 images is allowed");
  const out: { name: string; path: string; bytes: Uint8Array }[] = [];
  for (const f of files) {
    need(f.size <= 5 * 1048576, 400, `photos: "${f.name}" exceeds 5 MB`);
    const b = new Uint8Array(await f.arrayBuffer());
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    need((f.type === "image/jpeg" && jpg) || (f.type === "image/png" && png), 400, `photos: "${f.name}" must be a valid JPEG or PNG`);
    out.push({ name: f.name.slice(0, 120), path: `${crypto.randomUUID()}.${png ? "png" : "jpg"}`, bytes: b });
  }
  return out;
}

/* ---- routes ---- */
type Ctx = { req: Request; url: URL; user: User; p: Record<string, string> };
type Role = "public" | "any" | User["role"];
type Handler = (c: Ctx) => Promise<Response> | Response;
type Route = { method: string; pattern: RegExp; role: Role; handler: Handler };
const routes: Route[] = [];
const route = (method: string, path: string, role: Role, handler: Handler) =>
  routes.push({ method, pattern: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), role, handler });
const body = (c: Ctx) => c.req.json().catch(() => null);

const byNew = (a: { submitted_at: Date }, b: { submitted_at: Date }) => +b.submitted_at - +a.submitted_at;
const isAdmin = (c: Ctx) => c.user.role === "ADMINISTRATOR";

route("POST", "/api/login", "public", async c => {
  const { email, password } = parse(Login, await body(c).then(b => b ?? {}));
  const u = db.users.find(x => x.email === email.toLowerCase());
  need(u && await Bun.password.verify(password, u.password_hash), 401, "Invalid email or password");
  const tok = crypto.randomUUID() + crypto.randomUUID(), now = Date.now();
  for (const [k, s] of db.sessions) if (s.expires < now) db.sessions.delete(k);   // drop sessions that were never used again
  db.sessions.set(th(tok), { user_id: u.user_id, expires: now + 12 * 3600e3, last: now });
  return json({ user: publicUser(u) }, 200, { "set-cookie": cookie(tok, 43200) });
});
route("POST", "/api/logout", "public", c => {
  const tok = sid(c.req); if (tok) db.sessions.delete(th(tok));
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
});
route("GET", "/api/me", "any", c => json({ user: c.user }));

route("POST", "/api/issues", "END_USER", async c => {
  const fd = await c.req.formData().catch(() => null); need(fd, 400, "Expected multipart form data");
  const d = parse(IssueIn, { title: fd.get("title"), category: fd.get("category"), location: fd.get("location"), description: fd.get("description"), ack: fd.get("ack") });
  const photos = await savePhotos(fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0));
  for (const p of photos) await storage.put(p.path, p.bytes);
  return json({ issue: svc.create(c.user, d, photos) }, 201);
});
route("GET", "/api/issues", "any", c => {
  const sp = c.url.searchParams, q = (sp.get("q") ?? "").toLowerCase();
  const st = z.enum(STAT).safeParse(sp.get("status")), ct = z.enum(CATS).safeParse(sp.get("category")), pr = z.enum(PRI).safeParse(sp.get("priority"));
  const woBy = new Map(db.wos.map(w => [w.issue_id, w]));   // one pass instead of a scan per issue
  const rows = db.issues.filter(i => (isAdmin(c) || i.user_id === c.user.user_id) && (!q || i.issue_id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
    && (!st.success || i.status === st.data) && (!ct.success || i.category === ct.data) && (!pr.success || woBy.get(i.issue_id)?.priority === pr.data))
    .sort(byNew).map(i => { const w = woBy.get(i.issue_id); return { ...i, priority: w?.priority ?? null, deadline: w?.deadline ?? null, work_order_id: w?.work_order_id ?? null }; });
  return json({ issues: rows });
});
route("GET", "/api/issues/:id", "any", c => {
  const i = db.issues.find(x => x.issue_id === c.p.id);
  need(i && (isAdmin(c) || i.user_id === c.user.user_id), 404, "Issue not found");   // 404 hides other users' records
  const wo = woOf(i.issue_id) ?? null;
  const updates = wo ? db.updates.filter(u => u.work_order_id === wo.work_order_id).sort((a, b) => +b.updated_at - +a.updated_at) : [];
  const photos = db.photos.filter(p => p.issue_id === i.issue_id).map(({ photo_id, file_name }) => ({ photo_id, file_name }));
  return json({ issue: { ...i, submitter: db.users.find(u => u.user_id === i.user_id)?.name }, workOrder: wo, updates, photos });
});
route("GET", "/api/photos/:id", "any", c => {
  const p = db.photos.find(x => x.photo_id === c.p.id), i = p && db.issues.find(x => x.issue_id === p.issue_id);
  need(p && i && (isAdmin(c) || i.user_id === c.user.user_id), 404, "Photo not found");
  return new Response(storage.get(p.file_path));
});
route("POST", "/api/issues/:id/close", "ADMINISTRATOR", async c => { svc.close(c.p.id, parse(z.object({ feedback: z.string().max(500).optional() }), (await body(c)) ?? {}).feedback); return json({ ok: true }); });
route("POST", "/api/issues/:id/work-order", "ADMINISTRATOR", async c => json({ workOrder: svc.createWO(c.p.id, parse(WOIn, await body(c))) }, 201));
route("POST", "/api/issues/:id/resolve", "END_USER", c => { svc.resolve(c.p.id, c.user); return json({ ok: true }); });
route("GET", "/api/work-orders", "ADMINISTRATOR", () => json({ workOrders: db.wos.map(w => ({ ...w, overdue: w.deadline < today() && w.status !== "RESOLVED" })).sort((a, b) => +b.created_at - +a.created_at) }));
route("PATCH", "/api/work-orders/:id", "ADMINISTRATOR", async c => { svc.updateWO(c.p.id, parse(WOUp, await body(c))); return json({ ok: true }); });

route("GET", "/api/notifications", "any", c => json({ notifications: db.notes.filter(n => n.user_id === c.user.user_id).sort((a, b) => +b.created_at - +a.created_at) }));
route("POST", "/api/notifications/:id/read", "any", c => {
  const n = db.notes.find(x => x.notification_id === c.p.id && x.user_id === c.user.user_id); need(n, 404, "Notification not found"); n.is_read = true; return json({ ok: true });
});
route("GET", "/api/bootstrap", "any", c => {   // everything the UI needs for this user, in one round trip
  const issues = db.issues.filter(i => isAdmin(c) || i.user_id === c.user.user_id).sort(byNew), ids = new Set(issues.map(i => i.issue_id));
  const workOrders = db.wos.filter(w => ids.has(w.issue_id)), woIds = new Set(workOrders.map(w => w.work_order_id));
  return json({ issues, photos: db.photos.filter(p => ids.has(p.issue_id)).map(({ photo_id, issue_id, file_name }) => ({ photo_id, issue_id, file_name })),
    workOrders, updates: db.updates.filter(u => woIds.has(u.work_order_id)).sort((a, b) => +a.updated_at - +b.updated_at),
    notifications: db.notes.filter(n => n.user_id === c.user.user_id).sort((a, b) => +b.created_at - +a.created_at),
    users: db.users.filter(u => isAdmin(c) || u.user_id === c.user.user_id).map(u => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role })) });
});
route("POST", "/api/users", "ADMINISTRATOR", async c => json({ user: publicUser(await svc.createUser(parse(UserIn, await body(c)))) }, 201));
route("PATCH", "/api/users/:id", "ADMINISTRATOR", async c => json({ user: publicUser(await svc.updateUser(c.p.id, parse(UserUp, await body(c)))) }));
route("GET", "/api/dashboard", "ADMINISTRATOR", () => {
  const count = (k: "status" | "category") => Object.entries(db.issues.reduce<Record<string, number>>((m, i) => (m[i[k]] = (m[i[k]] ?? 0) + 1, m), {})).map(([key, n]) => ({ [k]: key, n }));
  const withWO = new Set(db.wos.map(w => w.issue_id));
  return json({ total: db.issues.length, byStatus: count("status"), byCategory: count("category"),
    overdue: db.wos.filter(w => w.deadline < today() && w.status !== "RESOLVED").length,
    unassigned: db.issues.filter(i => i.status === "OPEN" && !withWO.has(i.issue_id)).length,
    recent: [...db.issues].sort(byNew).slice(0, 8) });
});

openDb();
if (!load()) { await seed(); save(); }   // first run: create demo data and store it in ciwt.db
Bun.serve({
  port: +(process.env.PORT ?? 3000),
  async fetch(req) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return new Response(Bun.file("public/index.html"));
    try {
      if (req.method !== "GET") { const o = req.headers.get("origin"); need(!o || new URL(o).host === req.headers.get("host"), 403, "Cross-origin request blocked"); }  // CSRF
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const mt = r.pattern.exec(url.pathname); if (!mt) continue;
        let user: User | null = null;
        if (r.role !== "public") { user = await auth(req); need(user, 401, "Please log in again"); need(r.role === "any" || user.role === r.role, 403, "You do not have access to this action"); }
        const res = await r.handler({ req, url, user: user as User, p: mt.groups ?? {} });
        if (req.method !== "GET" && !/\/api\/(login|logout)$/.test(url.pathname)) save();   // persist every successful change
        return res;
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e); return json({ error: "Internal server error" }, 500);
    }
  },
});
console.log("CIWT API on :" + (process.env.PORT ?? 3000));
