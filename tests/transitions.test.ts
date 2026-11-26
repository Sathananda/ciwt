import { describe, test, expect, beforeEach } from "bun:test";
import { db, reset, addDays, nextIssueId, type User } from "../store";
import { svc, HttpError } from "../services";

const owner: User = { user_id: "u-owner", name: "Owner", email: "o@t", role: "END_USER" };
const other: User = { user_id: "u-other", name: "Other", email: "x@t", role: "END_USER" };
beforeEach(reset);

const mkIssue = (status = "OPEN") => {
  const issue_id = nextIssueId();
  db.issues.push({ issue_id, user_id: owner.user_id, title: "t", description: "d", category: "OTHERS", location: "Lab", status, closure_feedback: null, submitted_at: new Date() });
  return issue_id;
};
const issue = (id: string) => db.issues.find(i => i.issue_id === id)!;
const wo = (id: string) => db.wos.find(w => w.issue_id === id);
const wod = (deadline = addDays(5)) => ({ work_details: "Fix it", assignment_type: "INTERNAL", priority: "HIGH", deadline });
const fails = (fn: () => unknown, code: number) => {
  try { fn(); } catch (e) { expect(e).toBeInstanceOf(HttpError); expect((e as HttpError).status).toBe(code); return; }
  throw new Error("expected the call to fail");
};

describe("valid transitions", () => {
  test("OPEN -> IN_PROGRESS on work-order creation; WO ASSIGNED; owner notified", () => {
    const id = mkIssue(); svc.createWO(id, wod());
    expect(issue(id).status).toBe("IN_PROGRESS"); expect(wo(id)!.status).toBe("ASSIGNED");
    expect(db.notes.filter(n => n.user_id === owner.user_id && n.issue_id === id).length).toBe(1);
  });
  test("OPEN -> CLOSED with default feedback when blank", () => {
    const id = mkIssue(); svc.close(id, "  ");
    expect(issue(id).status).toBe("CLOSED"); expect(issue(id).closure_feedback!.length).toBeGreaterThan(5);
  });
  test("owner resolves IN_PROGRESS: issue and work order resolve together with a note", () => {
    const id = mkIssue(); svc.createWO(id, wod()); svc.resolve(id, owner);
    expect(issue(id).status).toBe("RESOLVED"); expect(wo(id)!.status).toBe("RESOLVED"); expect(wo(id)!.resolution_note).toBeTruthy();
  });
  test("work-order update adds progress and notifies", () => {
    const id = mkIssue(), w = svc.createWO(id, wod()); svc.updateWO(w.work_order_id, { priority: "LOW", progress: "Parts ordered" });
    expect(wo(id)!.priority).toBe("LOW"); expect(db.updates.length).toBe(1); expect(db.notes.length).toBe(2);
  });
});

describe("invalid transitions", () => {
  test("cannot close twice or create a work order on a closed issue", () => {
    const id = mkIssue(); svc.close(id); fails(() => svc.close(id), 400); fails(() => svc.createWO(id, wod()), 400);
  });
  test("CLOSED and RESOLVED are final", () => {
    fails(() => svc.resolve(mkIssue("CLOSED"), owner), 400);
    const id = mkIssue(); svc.createWO(id, wod()); svc.resolve(id, owner); fails(() => svc.resolve(id, owner), 400);
  });
  test("resolving an OPEN issue is rejected", () => fails(() => svc.resolve(mkIssue(), owner), 400));
  test("a second work order for the same issue is rejected", () => { const id = mkIssue(); svc.createWO(id, wod()); fails(() => svc.createWO(id, wod()), 400); });
  test("resolved work orders cannot be edited", () => {
    const id = mkIssue(), w = svc.createWO(id, wod()); svc.resolve(id, owner); fails(() => svc.updateWO(w.work_order_id, { priority: "LOW" }), 400);
  });
});

describe("ownership", () => {
  test("another user gets 403 and nothing changes", () => {
    const id = mkIssue(); svc.createWO(id, wod()); fails(() => svc.resolve(id, other), 403);
    expect(issue(id).status).toBe("IN_PROGRESS"); expect(wo(id)!.status).toBe("ASSIGNED");
  });
});

describe("rejected requests leave no partial changes", () => {
  test("past target date: issue stays OPEN, no work order, no notification", () => {
    const id = mkIssue(); fails(() => svc.createWO(id, wod(addDays(-1))), 400);
    expect(issue(id).status).toBe("OPEN"); expect(wo(id)).toBeUndefined(); expect(db.notes.length).toBe(0);
  });
  test("IN_PROGRESS issue without an active work order: resolve fails and status is unchanged", () => {
    const id = mkIssue("IN_PROGRESS"); fails(() => svc.resolve(id, owner), 400); expect(issue(id).status).toBe("IN_PROGRESS");
  });
});
