import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "./server.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT NOT NULL,
    status TEXT DEFAULT 'Not started',
    favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    interview_stage TEXT NOT NULL,
    interview_dttm TEXT NOT NULL,
    interview_type TEXT
  );
  CREATE TABLE IF NOT EXISTS interview_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    difficulty INTEGER NOT NULL
  );
`;

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-server";
const SESSION_SECRET = "dev-secret";

const testDb = new Database(":memory:");
testDb.exec(SCHEMA);
testDb
	.prepare("INSERT INTO users (id, email) VALUES (?, ?)")
	.run(TEST_USER_ID, "test@test.com");
testDb
	.prepare(
		"INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))",
	)
	.run(
		TEST_SESSION_ID,
		JSON.stringify({
			userId: TEST_USER_ID,
			cookie: { originalMaxAge: 604800000 },
		}),
	);

const sig = createHmac("sha256", SESSION_SECRET)
	.update(TEST_SESSION_ID)
	.digest("base64")
	.replace(/=+$/, "");
const AUTH_COOKIE = `connect.sid=${encodeURIComponent(`s:${TEST_SESSION_ID}.${sig}`)}`;

const app = createApp(testDb);

describe("requireAuth middleware", () => {
	it("returns 401 for unauthenticated requests to job routes", async () => {
		const res = await request(app).get("/api/jobs");
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("returns 401 for unauthenticated requests to interview routes", async () => {
		const res = await request(app).get("/api/jobs/1/interviews");
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("passes through authenticated requests", async () => {
		const res = await request(app).get("/api/jobs").set("Cookie", AUTH_COOKIE);
		expect(res.status).toBe(200);
	});
});
