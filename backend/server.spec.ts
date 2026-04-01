import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import {
	createApp,
	TERMINAL_STATUSES,
	VALID_ENDING_SUBSTATUSES,
	VALID_INTERVIEW_TYPES,
	VALID_INTERVIEW_VIBES,
} from "./server.js";

const testDb = new Database(":memory:");
testDb.exec(`
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
    job_description TEXT,
    ending_substatus TEXT,
    date_phone_screen TEXT,
    date_last_onsite TEXT
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id                 INTEGER NOT NULL,
    interview_type         TEXT NOT NULL,
    interview_dttm         TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_vibe         TEXT,
    interview_notes        TEXT
  )
`);

// Seed a test user and a pre-signed session so job route tests can authenticate.
// The session cookie is signed using the same algorithm as the cookie-signature
// package (HMAC-SHA256, base64 without trailing '='), matching express-session's
// default 'dev-secret'.
const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-id-abc123";
const SESSION_SECRET = "dev-secret";

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

// Helper that attaches the auth cookie to every request
function req(method: "get" | "post" | "put" | "delete", url: string) {
	return request(app)[method](url).set("Cookie", AUTH_COOKIE);
}

afterEach(() => {
	testDb.exec("DELETE FROM interviews");
	testDb.exec("DELETE FROM jobs");
});

const BASE_JOB = {
	company: "Acme Corp",
	role: "Engineer",
	link: "https://acme.example.com/jobs/1",
	status: "Not started",
	referred_by: null,
	favorite: false,
	salary: null,
	fit_score: null,
	date_applied: null,
	recruiter: null,
	notes: null,
};

describe("GET /api/jobs", () => {
	it("returns an empty array when no jobs exist", async () => {
		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("returns all jobs sorted by created_at DESC", async () => {
		testDb
			.prepare(
				"INSERT INTO jobs (user_id, company, role, link, created_at) VALUES (?, ?, ?, ?, ?)",
			)
			.run(
				TEST_USER_ID,
				"First Corp",
				"Dev",
				"https://a.com",
				"2024-01-01 00:00:00",
			);
		testDb
			.prepare(
				"INSERT INTO jobs (user_id, company, role, link, created_at) VALUES (?, ?, ?, ?, ?)",
			)
			.run(
				TEST_USER_ID,
				"Second Corp",
				"PM",
				"https://b.com",
				"2024-01-02 00:00:00",
			);

		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0].company).toBe("Second Corp");
		expect(res.body[1].company).toBe("First Corp");
	});

	it("converts favorite from 0/1 to boolean", async () => {
		testDb
			.prepare(
				"INSERT INTO jobs (user_id, company, role, link, favorite) VALUES (?, ?, ?, ?, ?)",
			)
			.run(TEST_USER_ID, "Acme", "Dev", "https://a.com", 0);

		const res = await req("get", "/api/jobs");
		expect(res.body[0].favorite).toBe(false);
	});
});

describe("POST /api/jobs", () => {
	it("creates a job and returns 201 with the created record", async () => {
		const res = await req("post", "/api/jobs").send(BASE_JOB);
		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.company).toBe("Acme Corp");
		expect(res.body.role).toBe("Engineer");
	});

	it("defaults status to 'Not started' when not provided", async () => {
		const { status: _s, ...withoutStatus } = BASE_JOB;
		const res = await req("post", "/api/jobs").send(withoutStatus);
		expect(res.status).toBe(201);
		expect(res.body.status).toBe("Not started");
	});

	it("stores referred_by name and converts favorite to boolean in the response", async () => {
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			referred_by: "Jane Doe",
			favorite: true,
		});
		expect(res.status).toBe(201);
		expect(res.body.referred_by).toBe("Jane Doe");
		expect(res.body.favorite).toBe(true);
	});

	it("stores null for optional fields when omitted", async () => {
		const res = await req("post", "/api/jobs").send(BASE_JOB);
		expect(res.body.salary).toBeNull();
		expect(res.body.fit_score).toBeNull();
		expect(res.body.recruiter).toBeNull();
		expect(res.body.notes).toBeNull();
		expect(res.body.ending_substatus).toBeNull();
	});

	it("returns 409 when a job with the same company and link already exists", async () => {
		const first = await req("post", "/api/jobs").send(BASE_JOB);
		expect(first.status).toBe(201);

		const second = await req("post", "/api/jobs").send(BASE_JOB);
		expect(second.status).toBe(409);
		expect(second.body).toEqual({ error: "Job already exists" });
	});

	it("allows the same company with a different link", async () => {
		const first = await req("post", "/api/jobs").send(BASE_JOB);
		expect(first.status).toBe(201);

		const second = await req("post", "/api/jobs").send({
			...BASE_JOB,
			link: "https://acme.example.com/jobs/2",
		});
		expect(second.status).toBe(201);
	});

	it("allows the same link at a different company", async () => {
		const first = await req("post", "/api/jobs").send(BASE_JOB);
		expect(first.status).toBe(201);

		const second = await req("post", "/api/jobs").send({
			...BASE_JOB,
			company: "Other Corp",
		});
		expect(second.status).toBe(201);
	});
});

describe("PUT /api/jobs/:id", () => {
	it("updates an existing job and returns the updated record", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			company: "Updated Corp",
			status: "Resume submitted",
		});

		expect(res.status).toBe(200);
		expect(res.body.company).toBe("Updated Corp");
		expect(res.body.status).toBe("Resume submitted");
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999").send({
			...BASE_JOB,
			company: "Ghost",
		});
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("updates referred_by and favorite correctly", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			referred_by: "Jane Doe",
			favorite: true,
		});

		expect(res.body.referred_by).toBe("Jane Doe");
		expect(res.body.favorite).toBe(true);
	});
});

describe("ending_substatus validation", () => {
	const NON_TERMINAL_CASES = [
		"Not started",
		"Resume submitted",
		"Phone screen",
		"Interviewing",
	] as const;
	const VALID_SUBSTATUSES = [...VALID_ENDING_SUBSTATUSES];

	describe("POST /api/jobs", () => {
		it.each([
			...TERMINAL_STATUSES,
		])('returns 422 when status is "%s" and ending_substatus is absent', async (status) => {
			const res = await req("post", "/api/jobs").send({ ...BASE_JOB, status });
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/ending_substatus is required/);
		});

		it.each([
			...TERMINAL_STATUSES,
		])('returns 422 when status is "%s" and ending_substatus is an invalid value', async (status) => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				status,
				ending_substatus: "Vanished",
			});
			expect(res.status).toBe(422);
		});

		it.each(
			VALID_SUBSTATUSES,
		)('accepts ending_substatus "%s" with terminal status', async (ending_substatus) => {
			const status = "Offer!";
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				status,
				ending_substatus,
			});
			expect(res.status).toBe(201);
			expect(res.body.ending_substatus).toBe(ending_substatus);
		});

		it.each(
			NON_TERMINAL_CASES,
		)('returns 422 when status is "%s" and ending_substatus is set', async (status) => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				status,
				ending_substatus: "Ghosted",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/must be null/);
		});

		it("returns ending_substatus as null for non-terminal jobs", async () => {
			const res = await req("post", "/api/jobs").send(BASE_JOB);
			expect(res.status).toBe(201);
			expect(res.body.ending_substatus).toBeNull();
		});
	});

	describe("PUT /api/jobs/:id", () => {
		it("returns 422 when updating to terminal status without ending_substatus", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const id: number = createRes.body.id;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				status: "Rejected/Withdrawn",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/ending_substatus is required/);
		});

		it("accepts a valid ending_substatus when updating to a terminal status", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const id: number = createRes.body.id;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				status: "Rejected/Withdrawn",
				ending_substatus: "Ghosted",
			});
			expect(res.status).toBe(200);
			expect(res.body.ending_substatus).toBe("Ghosted");
		});

		it("returns 422 when updating a non-terminal job with a non-null ending_substatus", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const id: number = createRes.body.id;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				status: "Resume submitted",
				ending_substatus: "Ghosted",
			});
			expect(res.status).toBe(422);
		});

		it("clears ending_substatus when moving from terminal back to non-terminal", async () => {
			const createRes = await req("post", "/api/jobs").send({
				...BASE_JOB,
				status: "Offer!",
				ending_substatus: "Offer accepted",
			});
			const id: number = createRes.body.id;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				status: "Interviewing",
			});
			expect(res.status).toBe(200);
			expect(res.body.ending_substatus).toBeNull();
		});
	});
});

describe("date_phone_screen and date_last_onsite fields", () => {
	it("stores null for both date fields when omitted on create", async () => {
		const res = await req("post", "/api/jobs").send(BASE_JOB);
		expect(res.status).toBe(201);
		expect(res.body.date_phone_screen).toBeNull();
		expect(res.body.date_last_onsite).toBeNull();
	});

	it("stores provided date_phone_screen and date_last_onsite on create", async () => {
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			date_phone_screen: "2026-03-20T10:00",
			date_last_onsite: "2026-03-23T09:00",
		});
		expect(res.status).toBe(201);
		expect(res.body.date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body.date_last_onsite).toBe("2026-03-23T09:00");
	});

	it("updates date_phone_screen and date_last_onsite via PUT", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			date_phone_screen: "2026-03-20T10:00",
			date_last_onsite: "2026-03-23T09:00",
		});
		expect(res.status).toBe(200);
		expect(res.body.date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body.date_last_onsite).toBe("2026-03-23T09:00");
	});

	it("clears both date fields when PUT sends null values", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			date_phone_screen: "2026-03-20T10:00",
			date_last_onsite: "2026-03-23T09:00",
		});
		const id: number = createRes.body.id;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			date_phone_screen: null,
			date_last_onsite: null,
		});
		expect(res.status).toBe(200);
		expect(res.body.date_phone_screen).toBeNull();
		expect(res.body.date_last_onsite).toBeNull();
	});

	it("returns both date fields in GET /api/jobs", async () => {
		await req("post", "/api/jobs").send({
			...BASE_JOB,
			date_phone_screen: "2026-03-20T10:00",
			date_last_onsite: "2026-03-23T09:00",
		});

		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body[0].date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body[0].date_last_onsite).toBe("2026-03-23T09:00");
	});
});

describe("DELETE /api/jobs/:id", () => {
	it("deletes a job and returns success", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("delete", `/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);

		const getRes = await req("get", "/api/jobs");
		expect(getRes.body).toHaveLength(0);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});

describe("GET /api/jobs/:jobId", () => {
	it("returns a single job by id", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("get", `/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(id);
		expect(res.body.company).toBe("Acme Corp");
	});

	it("converts favorite from 0/1 to boolean", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			favorite: true,
		});
		const id: number = createRes.body.id;

		const res = await req("get", `/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.favorite).toBe(true);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});

const BASE_INTERVIEW = {
	interview_type: "phone_screen",
	interview_dttm: "2026-04-01T10:00",
};

describe("GET /api/jobs/:jobId/interviews", () => {
	it("returns an empty array when no interviews exist", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("get", `/api/jobs/${jobId}/interviews`);
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("returns all interviews for a job", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		await req("post", `/api/jobs/${jobId}/interviews`).send(BASE_INTERVIEW);
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_type: "onsite",
		});

		const res = await req("get", `/api/jobs/${jobId}/interviews`);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999/interviews");
		expect(res.status).toBe(404);
	});
});

describe("POST /api/jobs/:jobId/interviews", () => {
	it("creates an interview and returns 201 with the record", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_interviewers: "Alice, Bob",
			interview_vibe: "casual",
			interview_notes: "Went well",
		});

		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.job_id).toBe(jobId);
		expect(res.body.interview_type).toBe("phone_screen");
		expect(res.body.interview_dttm).toBe("2026-04-01T10:00");
		expect(res.body.interview_interviewers).toBe("Alice, Bob");
		expect(res.body.interview_vibe).toBe("casual");
		expect(res.body.interview_notes).toBe("Went well");
	});

	it("stores null for optional fields when omitted", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(
			BASE_INTERVIEW,
		);
		expect(res.status).toBe(201);
		expect(res.body.interview_interviewers).toBeNull();
		expect(res.body.interview_vibe).toBeNull();
		expect(res.body.interview_notes).toBeNull();
	});

	it("returns 422 when interview_type is missing", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		const { interview_type: _t, ...withoutType } = BASE_INTERVIEW;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(
			withoutType,
		);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_type/);
	});

	it("returns 422 when interview_type is invalid", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_type: "video_call",
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_type/);
	});

	it("returns 422 when interview_dttm is missing", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		const { interview_dttm: _d, ...withoutDttm } = BASE_INTERVIEW;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(
			withoutDttm,
		);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_dttm/);
	});

	it("returns 422 when interview_vibe is invalid", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_vibe: "stressed",
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_vibe/);
	});

	it.each([
		...VALID_INTERVIEW_TYPES,
	])('accepts interview_type "%s"', async (interview_type) => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_type,
		});
		expect(res.status).toBe(201);
		expect(res.body.interview_type).toBe(interview_type);
	});

	it.each([
		...VALID_INTERVIEW_VIBES,
	])('accepts interview_vibe "%s"', async (interview_vibe) => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_vibe,
		});
		expect(res.status).toBe(201);
		expect(res.body.interview_vibe).toBe(interview_vibe);
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("post", "/api/jobs/99999/interviews").send(
			BASE_INTERVIEW,
		);
		expect(res.status).toBe(404);
	});

	it("returns 422 when job_id in body does not match :jobId in route", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			job_id: jobId + 1,
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/job_id/);
	});
});

describe("PUT /api/jobs/:jobId/interviews/:interviewId", () => {
	it("updates an interview and returns the updated record", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		const createRes = await req("post", `/api/jobs/${jobId}/interviews`).send(
			BASE_INTERVIEW,
		);
		const interviewId: number = createRes.body.id;

		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/${interviewId}`,
		).send({
			...BASE_INTERVIEW,
			interview_type: "onsite",
			interview_vibe: "intense",
			interview_notes: "Updated notes",
		});

		expect(res.status).toBe(200);
		expect(res.body.interview_type).toBe("onsite");
		expect(res.body.interview_vibe).toBe("intense");
		expect(res.body.interview_notes).toBe("Updated notes");
	});

	it("returns 404 when interview does not exist", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("put", `/api/jobs/${jobId}/interviews/99999`).send(
			BASE_INTERVIEW,
		);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Interview not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999/interviews/1").send(
			BASE_INTERVIEW,
		);
		expect(res.status).toBe(404);
	});

	it("returns 422 when interview_type is invalid", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		const createRes = await req("post", `/api/jobs/${jobId}/interviews`).send(
			BASE_INTERVIEW,
		);
		const interviewId: number = createRes.body.id;

		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/${interviewId}`,
		).send({
			...BASE_INTERVIEW,
			interview_type: "video_call",
		});
		expect(res.status).toBe(422);
	});
});

describe("DELETE /api/jobs/:jobId/interviews/:interviewId", () => {
	it("deletes an interview and returns success", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;
		const createRes = await req("post", `/api/jobs/${jobId}/interviews`).send(
			BASE_INTERVIEW,
		);
		const interviewId: number = createRes.body.id;

		const res = await req(
			"delete",
			`/api/jobs/${jobId}/interviews/${interviewId}`,
		);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);

		const getRes = await req("get", `/api/jobs/${jobId}/interviews`);
		expect(getRes.body).toHaveLength(0);
	});

	it("returns 404 when interview does not exist", async () => {
		const jobRes = await req("post", "/api/jobs").send(BASE_JOB);
		const jobId: number = jobRes.body.id;

		const res = await req("delete", `/api/jobs/${jobId}/interviews/99999`);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Interview not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999/interviews/1");
		expect(res.status).toBe(404);
	});
});
