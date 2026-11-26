/* In-memory data store (resets when the server restarts). */
export type Role = "END_USER" | "ADMINISTRATOR";
export type User = { user_id: string; name: string; email: string; role: Role };
export type UserRec = User & { password_hash: string };
export interface Issue { issue_id: string; user_id: string; title: string; description: string; category: string; location: string; status: string; closure_feedback: string | null; submitted_at: Date }
export interface Photo { photo_id: string; issue_id: string; file_name: string; file_path: string }
export interface WorkOrder { work_order_id: string; issue_id: string; work_details: string; assignment_type: string; assigned_person_name: string | null; priority: string; deadline: string; status: string; resolution_note: string | null; created_at: Date; updated_at: Date }
export interface Progress { update_id: string; work_order_id: string; description: string; updated_at: Date }
export interface Note { notification_id: string; user_id: string; issue_id: string; message: string; is_read: boolean; created_at: Date }

export const db = {
  users: [] as UserRec[], issues: [] as Issue[], photos: [] as Photo[], wos: [] as WorkOrder[], updates: [] as Progress[], notes: [] as Note[],
  sessions: new Map<string, { user_id: string; expires: number; last: number }>(), iseq: 0, wseq: 0,
};
export const reset = () => { for (const k of ["users", "issues", "photos", "wos", "updates", "notes"] as const) db[k].length = 0; db.sessions.clear(); db.iseq = db.wseq = 0; };
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const today = () => iso(new Date());
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
export const nextIssueId = () => `I-${String(++db.iseq).padStart(3, "0")}`;
export const nextWoId = () => `WO-${String(++db.wseq).padStart(3, "0")}`;
export const publicUser = ({ password_hash, ...u }: UserRec): User => u;

/* Demo data: 1 admin, 3 users, 127 issues (50 Open, 25 In-Progress, 40 Resolved, 12 Closed). */
export async function seed() {
  const mk = async (name: string, email: string, pw: string, role: Role) => {
    const u: UserRec = { user_id: crypto.randomUUID(), name, email, role, password_hash: await Bun.password.hash(pw, { algorithm: "argon2id" }) };
    db.users.push(u); return u;
  };
  await mk("Admin", "admin@nitc.ac.in", "admin123", "ADMINISTRATOR");
  const us = [await mk("Aditya Dilip Ranbawale", "aarav@nitc.ac.in", "user123", "END_USER"), await mk("Zaki Md Irfan Sangam", "kiran@nitc.ac.in", "user123", "END_USER"), await mk("B.V. Sathananda Reddy", "meera@nitc.ac.in", "user123", "END_USER")];
  const T = ["Tube light flickering", "Tap leaking", "Broken chair", "Wi-Fi not working", "Corridor needs cleaning", "Fan not working", "Projector cable missing", "Water cooler leaking", "Desk wobbling"];
  const C = ["ELECTRICAL", "PLUMBING", "FURNITURE", "NETWORK", "CLEANING", "ELECTRICAL", "OTHERS", "PLUMBING", "FURNITURE"];
  const L = ["Main Block, Room 204", "MHB 2, B-Block - Room 7b05", "Central Library", "C Block, SCTI", "Mess Hall", "Sports Complex"];
  const W = ["Ramesh K", "Suresh P", "Anil V"], P = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  for (let i = 1; i <= 27; i++) {
    const st = i <= 10 ? "OPEN" : i <= 15 ? "IN_PROGRESS" : i <= 25 ? "RESOLVED" : "CLOSED", age = i <= 10 ? i : 30 - i, at = new Date(Date.now() - age * 864e5);
    const issue: Issue = { issue_id: nextIssueId(), user_id: us[i % 3].user_id, title: T[i % 9], description: "Reported at the location. Please check at the earliest.", category: C[i % 9], location: L[i % 6], status: st,
      closure_feedback: st === "CLOSED" ? "Duplicate of an existing ticket; already scheduled." : null, submitted_at: at };
    db.issues.push(issue);
    if (st !== "IN_PROGRESS" && st !== "RESOLVED") continue;
    const res = st === "RESOLVED", w: WorkOrder = { work_order_id: nextWoId(), issue_id: issue.issue_id, work_details: "Inspect and repair: " + T[i % 9], assignment_type: i % 2 ? "INTERNAL" : "EXTERNAL",
      assigned_person_name: W[i % 3], priority: P[i % 4], deadline: addDays(res ? -3 : i <= 13 ? i - 14 : 5), status: res ? "RESOLVED" : "ASSIGNED",
      resolution_note: res ? "Marked as resolved by the requester." : null, created_at: at, updated_at: at };
    db.wos.push(w);
    db.updates.push({ update_id: crypto.randomUUID(), work_order_id: w.work_order_id, description: "Technician visited; parts ordered.", updated_at: at });
  }
  addDemoIssues(100);   // extra volume for the dashboard, filters and work-order queue
}

/* Extra demo issues on top of the 27-issue fixture above, so the seeded queue looks like a real semester. */
const MORE_TITLES = ["Ceiling fan making noise", "Broken window pane", "Socket not working", "Tap running continuously",
  "Chair wheel broken", "Wi-Fi weak in corridor", "Bathroom door lock jammed", "Tube light not turning on",
  "Projector screen stuck", "Dustbin missing", "Table drawer stuck", "Switch board sparking",
  "Mess fan not working", "Lab computer not booting", "Water cooler not cooling", "Blackboard damaged",
  "Corridor tiles loose", "Street light not working", "CCTV camera loose", "Library shelf broken"];
const MORE_CATS = ["ELECTRICAL", "PLUMBING", "FURNITURE", "CLEANING", "NETWORK", "OTHERS"];
const MORE_LOCS = ["Main Block, Room 204", "MHB 2, B-Block - Room 7b05", "Central Library", "C Block, SCTI", "Mess Hall",
  "Sports Complex", "CS Dept, Lab 3", "Chemical Block, Lab 1", "Lecture Hall Complex, LH-2", "Hostel A, Floor 3"];
const MORE_DESC = ["Reported at the location. Please check at the earliest.", "Noticed during class hours; needs attention this week.",
  "Has been like this for a few days now. Affects daily use."];
export function addDemoIssues(n = 100) {
  const users = db.users.filter(u => u.role === "END_USER");
  if (!users.length) return;
  const staff = ["Ramesh K", "Suresh P", "Anil V", "Vijay M", "Ganesh T"], P = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const progress = ["Technician visited; parts ordered.", "Work started this morning.", "Awaiting replacement part.", "Repair scheduled with the vendor."];
  for (let i = 0; i < n; i++) {
    const k = i % 10, resolved = k >= 6 && k <= 8;
    const status = k <= 3 ? "OPEN" : k <= 5 ? "IN_PROGRESS" : resolved ? "RESOLVED" : "CLOSED";
    const title = MORE_TITLES[i % MORE_TITLES.length], at = new Date(Date.now() - (((i * 7) % 89) + 1) * 864e5);
    const issue: Issue = { issue_id: nextIssueId(), user_id: users[i % users.length].user_id, title,
      description: MORE_DESC[i % MORE_DESC.length], category: MORE_CATS[i % MORE_CATS.length], location: MORE_LOCS[i % MORE_LOCS.length], status,
      closure_feedback: status === "CLOSED" ? "Duplicate of an existing ticket; already scheduled." : null, submitted_at: at };
    db.issues.push(issue);
    if (status !== "IN_PROGRESS" && status !== "RESOLVED") continue;
    const w: WorkOrder = { work_order_id: nextWoId(), issue_id: issue.issue_id, work_details: "Inspect and repair: " + title,
      assignment_type: i % 2 ? "INTERNAL" : "EXTERNAL", assigned_person_name: staff[i % staff.length], priority: P[i % 4],
      deadline: resolved ? addDays(-((i % 5) + 1)) : i % 3 === 0 ? addDays(-((i % 4) + 1)) : addDays((i % 7) + 1),
      status: resolved ? "RESOLVED" : "ASSIGNED", resolution_note: resolved ? "Marked as resolved by the requester." : null, created_at: at, updated_at: at };
    db.wos.push(w);
    db.updates.push({ update_id: crypto.randomUUID(), work_order_id: w.work_order_id, description: progress[i % progress.length],
      updated_at: new Date(Math.min(+at + 864e5, Date.now())) });
    db.notes.push({ notification_id: crypto.randomUUID(), user_id: issue.user_id, issue_id: issue.issue_id,
      message: `Work order ${w.work_order_id} was assigned to ${issue.issue_id}.`, is_read: i % 4 === 0, created_at: at });
  }
}
