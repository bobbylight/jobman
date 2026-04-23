import { createHmac } from "node:crypto";
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
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id                INTEGER NOT NULL,
    interview_stage       TEXT NOT NULL,
    interview_dttm        TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_type        TEXT,
    interview_vibe        TEXT,
    interview_notes       TEXT,
    interview_result      TEXT,
    interview_feeling     TEXT
  );
  CREATE TABLE IF NOT EXISTS interview_questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id   INTEGER NOT NULL,
    question_type  TEXT NOT NULL,
    question_text  TEXT NOT NULL,
    question_notes TEXT,
    difficulty     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS job_tags (
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag    TEXT NOT NULL,
    PRIMARY KEY (job_id, tag)
  );
  CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);
`;

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-interview-insights";
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

function req(url: string) {
	return request(app).get(url).set("Cookie", AUTH_COOKIE);
}

function insertJob(): number {
	const res = testDb
		.prepare(
			`INSERT INTO jobs (user_id, company, role, link, status)
       VALUES (?, 'Acme', 'Engineer', 'https://example.com', 'Interviewing')`,
		)
		.run(TEST_USER_ID) as { lastInsertRowid: number };
	return Number(res.lastInsertRowid);
}

function insertInterview(
	jobId: number,
	overrides: { result?: string; dttm?: string } = {},
): number {
	const res = testDb
		.prepare(
			`INSERT INTO interviews (job_id, interview_stage, interview_dttm, interview_result)
       VALUES (?, 'phone_screen', ?, ?)`,
		)
		.run(
			jobId,
			overrides.dttm ?? "2026-04-01T10:00",
			overrides.result ?? null,
		) as { lastInsertRowid: number };
	return Number(res.lastInsertRowid);
}

afterEach(() => {
	testDb.exec("DELETE FROM interview_questions");
	testDb.exec("DELETE FROM interviews");
	testDb.exec("DELETE FROM jobs");
});

describe("GET /api/interview-insights", () => {
	it("returns 401 when the request is not authenticated", async () => {
		const res = await request(app).get("/api/interview-insights");
		expect(res.status).toBe(401);
	});

	it("returns 200 with the expected response shape", async () => {
		const res = await req("/api/interview-insights");
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			totalInterviews: expect.any(Number),
			totalQuestions: expect.any(Number),
			byStage: expect.any(Array),
			byType: expect.any(Array),
			feelingVsResult: expect.any(Array),
			difficultyDistribution: expect.any(Array),
			recentQuestions: expect.any(Array),
		});
		expect(
			res.body.passRate === null || typeof res.body.passRate === "number",
		).toBeTruthy();
		expect(
			res.body.avgDifficulty === null ||
				typeof res.body.avgDifficulty === "number",
		).toBeTruthy();
	});

	it("returns correct counts for the authenticated user's data", async () => {
		const jobId = insertJob();
		insertInterview(jobId, { result: "passed" });
		insertInterview(jobId, { result: "failed" });

		const res = await req("/api/interview-insights");
		expect(res.status).toBe(200);
		expect(res.body.totalInterviews).toBe(2);
		expect(res.body.passRate).toBe(0.5);
	});

	it("defaults to 'all' window when no query param is provided", async () => {
		const jobId = insertJob();
		insertInterview(jobId, { dttm: "2020-01-01T10:00" });

		const res = await req("/api/interview-insights");
		expect(res.status).toBe(200);
		expect(res.body.totalInterviews).toBe(1);
	});

	it("respects the window=30 query parameter", async () => {
		const jobId = insertJob();
		insertInterview(jobId, { dttm: "2020-01-01T10:00" });
		insertInterview(jobId, {
			dttm: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 16),
		});

		const res = await req("/api/interview-insights?window=30");
		expect(res.status).toBe(200);
		expect(res.body.totalInterviews).toBe(1);
	});

	it("respects the window=90 query parameter", async () => {
		const jobId = insertJob();
		insertInterview(jobId, { dttm: "2020-01-01T10:00" });
		insertInterview(jobId, {
			dttm: new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 16),
		});

		const res = await req("/api/interview-insights?window=90");
		expect(res.status).toBe(200);
		expect(res.body.totalInterviews).toBe(1);
	});

	it("treats an unrecognised window value as 'all'", async () => {
		const jobId = insertJob();
		insertInterview(jobId, { dttm: "2020-01-01T10:00" });

		const res = await req("/api/interview-insights?window=forever");
		expect(res.status).toBe(200);
		expect(res.body.totalInterviews).toBe(1);
	});
});
