import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";

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
    date_applied TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT NOT NULL,
    salary TEXT,
    fit_score TEXT,
    referred_by TEXT,
    status TEXT DEFAULT 'Not started',
    recruiter TEXT,
    notes TEXT,
    favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    job_description TEXT,
    ending_substatus TEXT,
    date_phone_screen TEXT,
    date_last_onsite TEXT
  );
  CREATE TABLE IF NOT EXISTS job_status_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    interview_stage TEXT NOT NULL,
    interview_dttm TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_type TEXT,
    interview_vibe TEXT,
    interview_notes TEXT
  );
  CREATE TABLE IF NOT EXISTS interview_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_notes TEXT,
    difficulty INTEGER NOT NULL
  );
`;

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-stats-routes";
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
		JSON.stringify({ userId: TEST_USER_ID, cookie: { originalMaxAge: 604800000 } }),
	);

const sig = createHmac("sha256", SESSION_SECRET)
	.update(TEST_SESSION_ID)
	.digest("base64")
	.replace(/=+$/, "");
const AUTH_COOKIE = `connect.sid=${encodeURIComponent(`s:${TEST_SESSION_ID}.${sig}`)}`;

const app = createApp(testDb);

function req(url: string) {
	return request(app).get(url).set("Cookie", AUTH_COOKIE);
}

afterEach(() => {
	testDb.exec("DELETE FROM jobs");
});

describe("GET /api/stats", () => {
	it("returns 401 when the request is not authenticated", async () => {
		const res = await request(app).get("/api/stats");
		expect(res.status).toBe(401);
	});

	it("returns 200 with the expected response shape", async () => {
		const res = await req("/api/stats");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			totalApplications: expect.any(Number),
			activePipeline: expect.any(Number),
			offersReceived: expect.any(Number),
			byStatus: expect.any(Array),
			applicationsByWeek: expect.any(Array),
		});
		// responseRate may be number or null
		expect(
			res.body.responseRate === null ||
				typeof res.body.responseRate === "number",
		).toBe(true);
	});

	it("returns correct counts for the authenticated user's jobs", async () => {
		// Create 2 jobs via the API to ensure they belong to the test user
		await request(app)
			.post("/api/jobs")
			.set("Cookie", AUTH_COOKIE)
			.send({
				company: "Alpha",
				role: "Dev",
				link: "https://alpha.com",
				status: "Not started",
				favorite: false,
			});
		await request(app)
			.post("/api/jobs")
			.set("Cookie", AUTH_COOKIE)
			.send({
				company: "Beta",
				role: "PM",
				link: "https://beta.com",
				status: "Interviewing",
				favorite: false,
			});

		const res = await req("/api/stats");
		expect(res.status).toBe(200);
		expect(res.body.totalApplications).toBe(2);
		expect(res.body.activePipeline).toBe(2);
	});

	it("defaults to 'all' window when no query param is provided", async () => {
		// Insert a very old job directly to verify 'all' includes it
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(TEST_USER_ID, "Old Co", "Dev", "https://old.com", "Not started", "2020-01-01");

		const res = await req("/api/stats");
		expect(res.status).toBe(200);
		expect(res.body.totalApplications).toBe(1);
	});

	it("respects the window=30 query parameter", async () => {
		// Recent job (today)
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, date('now'))`,
			)
			.run(TEST_USER_ID, "New Co", "Dev", "https://new.com", "Not started");
		// Old job (outside 30-day window)
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(TEST_USER_ID, "Old Co", "Dev", "https://old.com", "Not started", "2020-01-01");

		const res = await req("/api/stats?window=30");
		expect(res.status).toBe(200);
		expect(res.body.totalApplications).toBe(1);
	});

	it("respects the window=90 query parameter", async () => {
		// Job 60 days ago — inside 90-day window
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, date('now', '-60 days'))`,
			)
			.run(TEST_USER_ID, "Recent Co", "Dev", "https://recent.com", "Not started");
		// Job 100 days ago — outside 90-day window
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, date('now', '-100 days'))`,
			)
			.run(TEST_USER_ID, "Old Co", "Dev", "https://old.com", "Not started");

		const res = await req("/api/stats?window=90");
		expect(res.status).toBe(200);
		expect(res.body.totalApplications).toBe(1);
	});

	it("treats an unrecognised window value as 'all'", async () => {
		testDb
			.prepare(
				`INSERT INTO jobs (user_id, company, role, link, status, date_applied)
         VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(TEST_USER_ID, "Old Co", "Dev", "https://old.com", "Not started", "2020-01-01");

		const res = await req("/api/stats?window=forever");
		expect(res.status).toBe(200);
		expect(res.body.totalApplications).toBe(1);
	});
});
