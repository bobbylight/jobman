import { createHmac } from "node:crypto";
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
    status TEXT DEFAULT 'not_started',
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
  CREATE TABLE IF NOT EXISTS job_tags (
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag    TEXT NOT NULL,
    PRIMARY KEY (job_id, tag)
  );

  CREATE TABLE IF NOT EXISTS target_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'faang_adjacent',
    application_cooldown_days INTEGER,
    phone_screen_cooldown_days INTEGER,
    onsite_cooldown_days INTEGER,
    max_apps_per_period INTEGER,
    apps_period_days INTEGER,
    policy_summary TEXT,
    policy_url TEXT,
    policy_confidence TEXT,
    policy_updated_at TEXT,
    user_notes TEXT,
    hidden INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS job_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    base_pay_amount INTEGER,
    target_bonus_percent REAL,
    equity_amount INTEGER,
    equity_vesting_years INTEGER DEFAULT 4,
    equity_type TEXT,
    signing_bonus_amount INTEGER,
    wellness_stipend_amount INTEGER,
    other_amount INTEGER,
    other_label TEXT,
    other_is_recurring INTEGER DEFAULT 0,
    k401_match_percent REAL,
    offer_deadline TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
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
			cookie: { originalMaxAge: 604_800_000 },
			userId: TEST_USER_ID,
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

	it("returns 401 for unauthenticated requests to radar routes", async () => {
		const res = await request(app).get("/api/radar");
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("returns 401 for unauthenticated requests to interview-insights routes", async () => {
		const res = await request(app).get("/api/interview-insights");
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("passes through authenticated requests", async () => {
		const res = await request(app).get("/api/jobs").set("Cookie", AUTH_COOKIE);
		expect(res.status).toBe(200);
	});
});
