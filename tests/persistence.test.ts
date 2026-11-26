import { beforeEach,afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb, load, openDb, save } from "../persist";
import { db, reset } from "../store";

let testDirectory: string | undefined;
beforeEach(reset);
afterEach(async () => {
  closeDb();
  reset();
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = undefined;
});

describe("SQLite persistence", () => {
  test("load returns false for a new empty database", async () => {
    reset();
    testDirectory = await mkdtemp(join(tmpdir(), "ciwt-persist-"));
    openDb(join(testDirectory, "test.db"));

    expect(load()).toBe(false);
    expect(db.users).toHaveLength(0);
    expect(db.issues).toHaveLength(0);
  });

  test("saved records can be loaded after reopening the database", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "ciwt-persist-"));
    const file = join(testDirectory, "test.db");
    const submittedAt = new Date("2026-01-02T03:04:05.000Z");
    const createdAt = new Date("2026-01-03T04:05:06.000Z");
    const updatedAt = new Date("2026-01-04T05:06:07.000Z");

    openDb(file);
    db.users.push({
      user_id: "user-1",
      name: "Test User",
      email: "test@example.com",
      password_hash: "test-hash",
      role: "END_USER",
    });
    db.issues.push({
      issue_id: "I-001",
      user_id: "user-1",
      title: "Broken light",
      description: "The light is not working.",
      category: "ELECTRICAL",
      location: "Lab 1",
      status: "IN_PROGRESS",
      closure_feedback: null,
      submitted_at: submittedAt,
    });
    db.photos.push({
      photo_id: "photo-1",
      issue_id: "I-001",
      file_name: "light.png",
      file_path: "uploads/light.png",
    });
    db.wos.push({
      work_order_id: "WO-001",
      issue_id: "I-001",
      work_details: "Replace the light.",
      assignment_type: "INTERNAL",
      assigned_person_name: "Technician",
      priority: "HIGH",
      deadline: "2026-02-01",
      status: "ASSIGNED",
      resolution_note: null,
      created_at: createdAt,
      updated_at: updatedAt,
    });
    db.updates.push({
      update_id: "update-1",
      work_order_id: "WO-001",
      description: "Inspection completed.",
      updated_at: updatedAt,
    });
    db.notes.push({
      notification_id: "notification-1",
      user_id: "user-1",
      issue_id: "I-001",
      message: "A work order was assigned.",
      is_read: true,
      created_at: updatedAt,
    });
    db.iseq = 1;
    db.wseq = 1;
    save();

    closeDb();
    reset();
    openDb(file);

    expect(load()).toBe(true);
    expect(db.users[0]).toMatchObject({ user_id: "user-1", email: "test@example.com" });
    expect(db.issues[0]).toMatchObject({ issue_id: "I-001", user_id: "user-1", status: "IN_PROGRESS" });
    expect(db.issues[0].submitted_at).toEqual(submittedAt);
    expect(db.photos[0]).toMatchObject({ photo_id: "photo-1", issue_id: "I-001" });
    expect(db.wos[0]).toMatchObject({ work_order_id: "WO-001", issue_id: "I-001", status: "ASSIGNED" });
    expect(db.wos[0].created_at).toEqual(createdAt);
    expect(db.wos[0].updated_at).toEqual(updatedAt);
    expect(db.updates[0]).toMatchObject({ update_id: "update-1", work_order_id: "WO-001" });
    expect(db.updates[0].updated_at).toEqual(updatedAt);
    expect(db.notes[0]).toMatchObject({ notification_id: "notification-1", is_read: true });
    expect(db.notes[0].created_at).toEqual(updatedAt);
    expect(db.iseq).toBe(1);
    expect(db.wseq).toBe(1);
  });
});
