import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import {
	TERMINAL_STATUSES,
	VALID_ENDING_SUBSTATUSES,
} from "../validators.js";

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
    interview_type TEXT NOT NULL,
    interview_dttm TEXT NOT NULL,
    interview_interviewers TEXT,
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
const TEST_SESSION_ID = "test-session-jobs-routes";
const SESSION_SECRET = "dev-secret";

const testDb = new Database(":memory:");
testDb.exec(SCHEMA);
testDb.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(TEST_USER_ID, "test@test.com");
testDb
	.prepare("INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))")
	.run(TEST_SESSION_ID, JSON.stringify({ userId: TEST_USER_ID, cookie: { originalMaxAge: 604800000 } }));

const sig = createHmac("sha256", SESSION_SECRET)
	.update(TEST_SESSION_ID)
	.digest("base64")
	.replace(/=+$/, "");
const AUTH_COOKIE = `connect.sid=${encodeURIComponent(`s:${TEST_SESSION_ID}.${sig}`)}`;

const app = createApp(testDb);

function req(method: "get" | "post" | "put" | "delete", url: string) {
	return request(app)[method](url).set("Cookie", AUTH_COOKIE);
}

afterEach(() => {
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
	it("returns 200 with a list of jobs", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].company).toBe("Acme Corp");
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

	it("returns 404 when job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});

describe("POST /api/jobs", () => {
	it("creates a job and returns 201 with the created record", async () => {
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			referred_by: "Jane Doe",
		});
		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.company).toBe("Acme Corp");
		expect(res.body.role).toBe("Engineer");
		expect(res.body.referred_by).toBe("Jane Doe");
	});

	it("defaults status to 'Not started' when not provided", async () => {
		const { status: _s, ...withoutStatus } = BASE_JOB;
		const res = await req("post", "/api/jobs").send(withoutStatus);
		expect(res.status).toBe(201);
		expect(res.body.status).toBe("Not started");
	});

	it("maps omitted optional fields to null", async () => {
		const res = await req("post", "/api/jobs").send(BASE_JOB);
		expect(res.body.salary).toBeNull();
		expect(res.body.fit_score).toBeNull();
		expect(res.body.recruiter).toBeNull();
		expect(res.body.notes).toBeNull();
		expect(res.body.ending_substatus).toBeNull();
		expect(res.body.date_phone_screen).toBeNull();
		expect(res.body.date_last_onsite).toBeNull();
	});

	it("returns 409 when a job with the same company and link already exists", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const second = await req("post", "/api/jobs").send(BASE_JOB);
		expect(second.status).toBe(409);
		expect(second.body).toEqual({ error: "Job already exists" });
	});

	it("allows the same company with a different link", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			link: "https://acme.example.com/jobs/2",
		});
		expect(res.status).toBe(201);
	});

	it("allows the same link at a different company", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			company: "Other Corp",
		});
		expect(res.status).toBe(201);
	});
});

describe("PUT /api/jobs/:id", () => {
	it("updates an existing job and returns 200 with the updated record", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			company: "Updated Corp",
			status: "Resume submitted",
			referred_by: "Jane Doe",
		});
		expect(res.status).toBe(200);
		expect(res.body.company).toBe("Updated Corp");
		expect(res.body.status).toBe("Resume submitted");
		expect(res.body.referred_by).toBe("Jane Doe");
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999").send(BASE_JOB);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});

describe("DELETE /api/jobs/:id", () => {
	it("deletes a job and returns success", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await req("delete", `/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
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
		it.each([...TERMINAL_STATUSES])(
			'returns 422 when status is "%s" and ending_substatus is absent',
			async (status) => {
				const res = await req("post", "/api/jobs").send({ ...BASE_JOB, status });
				expect(res.status).toBe(422);
				expect(res.body.error).toMatch(/ending_substatus is required/);
			},
		);

		it.each([...TERMINAL_STATUSES])(
			'returns 422 when status is "%s" and ending_substatus is invalid',
			async (status) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					status,
					ending_substatus: "Vanished",
				});
				expect(res.status).toBe(422);
			},
		);

		it.each(VALID_SUBSTATUSES)(
			'accepts ending_substatus "%s" with terminal status',
			async (ending_substatus) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					status: "Offer!",
					ending_substatus,
				});
				expect(res.status).toBe(201);
				expect(res.body.ending_substatus).toBe(ending_substatus);
			},
		);

		it.each(NON_TERMINAL_CASES)(
			'returns 422 when status is "%s" and ending_substatus is set',
			async (status) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					status,
					ending_substatus: "Ghosted",
				});
				expect(res.status).toBe(422);
				expect(res.body.error).toMatch(/must be null/);
			},
		);

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
	it("stores provided date fields on create", async () => {
		const res = await req("post", "/api/jobs").send({
			...BASE_JOB,
			date_phone_screen: "2026-03-20T10:00",
			date_last_onsite: "2026-03-23T09:00",
		});
		expect(res.status).toBe(201);
		expect(res.body.date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body.date_last_onsite).toBe("2026-03-23T09:00");
	});

	it("updates date fields via PUT", async () => {
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

	it("clears date fields when PUT sends null values", async () => {
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
});
