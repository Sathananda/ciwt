import { db, today, nextIssueId, nextWoId, type User, type UserRec, type Issue, type WorkOrder } from "./store";
export type { User };

export class HttpError extends Error { constructor(public status: number, m: string) { super(m); } }
export const need: (c: unknown, s: number, m: string) => asserts c = (c, s, m) => { if (!c) throw new HttpError(s, m); };

/* Business rules + status transitions. Each function validates first and mutates only after every check
   passes (and the server is single-threaded), so a rejected request never leaves partial changes. */
const notify = (user_id: string, issue_id: string, message: string) =>
  db.notes.push({ notification_id: crypto.randomUUID(), user_id, issue_id, message, is_read: false, created_at: new Date() });
const getIssue = (id: string): Issue => { const i = db.issues.find(x => x.issue_id === id); need(i, 404, "Issue not found"); return i; };
export const woOf = (issue_id: string) => db.wos.find(w => w.issue_id === issue_id);

export const svc = {
  async createUser(d: { name: string; email: string; password: string; role: "END_USER" | "ADMINISTRATOR" }): Promise<UserRec> {
    const email = d.email.trim().toLowerCase();
    need(!db.users.some(u => u.email === email), 409, "A user with this email already exists");
    const u: UserRec = { user_id: crypto.randomUUID(), name: d.name.trim(), email, role: d.role,
      password_hash: await Bun.password.hash(d.password, { algorithm: "argon2id" }) };
    db.users.push(u); return u;
  },
  async updateUser(id: string, d: { name?: string; email?: string; password?: string; role?: "END_USER" | "ADMINISTRATOR" }): Promise<UserRec> {
    const u = db.users.find(x => x.user_id === id); if (!u) throw new HttpError(404, "User not found");
    const email = d.email?.trim().toLowerCase();
    if (email && email !== u.email && db.users.some(x => x.email === email)) throw new HttpError(409, "A user with this email already exists");
    if (d.role === "END_USER" && u.role === "ADMINISTRATOR" && !db.users.some(x => x.role === "ADMINISTRATOR" && x.user_id !== id))
      throw new HttpError(409, "At least one administrator must remain");
    const hash = d.password ? await Bun.password.hash(d.password, { algorithm: "argon2id" }) : null;   // hash before mutating
    if (d.name) u.name = d.name;
    if (email) u.email = email;
    if (d.role) u.role = d.role;
    if (hash) u.password_hash = hash;
    return u;
  },
  create(user: User, d: { title: string; category: string; location: string; description: string }, photos: { name: string; path: string }[] = []): Issue {
    const issue: Issue = { issue_id: nextIssueId(), user_id: user.user_id, title: d.title, description: d.description, category: d.category, location: d.location, status: "OPEN", closure_feedback: null, submitted_at: new Date() };
    db.issues.unshift(issue);
    for (const p of photos) db.photos.push({ photo_id: crypto.randomUUID(), issue_id: issue.issue_id, file_name: p.name, file_path: p.path });
    return issue;
  },
  close(id: string, feedback?: string) {
    const i = getIssue(id); need(i.status === "OPEN", 400, "Only OPEN issues can be closed");
    i.status = "CLOSED"; i.closure_feedback = feedback?.trim() || "Your request was reviewed and closed by the administrator.";
    notify(i.user_id, id, `Issue ${id} was closed.`);
  },
  createWO(id: string, d: { work_details: string; assignment_type: string; assigned_person_name?: string; priority: string; deadline: string }): WorkOrder {
    const i = getIssue(id); need(i.status === "OPEN", 400, "Work orders can only be created from OPEN issues");
    need(!woOf(id), 409, "This issue already has a work order"); need(d.deadline >= today(), 400, "deadline: must not be before today");
    const now = new Date(), w: WorkOrder = { work_order_id: nextWoId(), issue_id: id, work_details: d.work_details, assignment_type: d.assignment_type, assigned_person_name: d.assigned_person_name || null,
      priority: d.priority, deadline: d.deadline, status: "ASSIGNED", resolution_note: null, created_at: now, updated_at: now };
    db.wos.push(w); i.status = "IN_PROGRESS"; notify(i.user_id, id, `Work order ${w.work_order_id} was assigned to ${id}.`);
    return w;
  },
  updateWO(woId: string, d: { work_details?: string; priority?: string; deadline?: string; assigned_person_name?: string; progress?: string }) {
    const w = db.wos.find(x => x.work_order_id === woId); if (!w) throw new HttpError(404, "Work order not found");
    need(w.status === "ASSIGNED", 400, "Resolved work orders cannot be edited");
    // keeping an already-passed deadline is fine (editing details of an overdue order); setting a new one is not
    need(!d.deadline || d.deadline === w.deadline || d.deadline >= today(), 400, "deadline: must not be before today");
    if (d.work_details) w.work_details = d.work_details;
    if (d.priority) w.priority = d.priority; if (d.deadline) w.deadline = d.deadline;
    if (d.assigned_person_name !== undefined) w.assigned_person_name = d.assigned_person_name || null;
    w.updated_at = new Date();
    if (d.progress) db.updates.push({ update_id: crypto.randomUUID(), work_order_id: woId, description: d.progress, updated_at: w.updated_at });
    notify(getIssue(w.issue_id).user_id, w.issue_id, `Work order ${woId} was updated.`);
  },
  resolve(id: string, user: User) {   // issue + work order resolve together
    const i = getIssue(id); need(i.user_id === user.user_id, 403, "You can only resolve your own issues");
    need(i.status === "IN_PROGRESS", 400, "Only IN_PROGRESS issues can be marked as resolved");
    const w = woOf(id); need(w && w.status === "ASSIGNED", 400, "No active work order for this issue");
    w.status = "RESOLVED"; w.resolution_note = "Marked as resolved by the requester."; w.updated_at = new Date(); i.status = "RESOLVED";
  },
};
