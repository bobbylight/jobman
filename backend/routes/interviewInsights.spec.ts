import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import { applySchema } from "../db.js";

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-interview-insights";
const SESSION_SECRET = "dev-secret";

const testDb = new Database(":memory:");
applySchema(testDb);
testDb.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  );
`);
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
       VALUES (?, 'Acme', 'Engineer', 'https://example.com', 'interviewing')`,
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

describe("gET /api/interview-insights", () => {
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
