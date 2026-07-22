import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import {
	JOB_MAX_LENGTHS,
	TERMINAL_STATUSES,
	VALID_OFFER_SUBSTATUSES,
	VALID_REJECTED_SUBSTATUSES,
} from "../validators.js";
import { applySchema } from "../db.js";

const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const TEST_SESSION_ID = "test-session-jobs-routes";
const OTHER_SESSION_ID = "test-session-jobs-routes-other";
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
testDb.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(TEST_USER_ID, "test@test.com");
testDb.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(OTHER_USER_ID, "other@test.com");
testDb
	.prepare("INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))")
	.run(TEST_SESSION_ID, JSON.stringify({ cookie: { originalMaxAge: 604_800_000 }, userId: TEST_USER_ID }));
testDb
	.prepare("INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))")
	.run(OTHER_SESSION_ID, JSON.stringify({ cookie: { originalMaxAge: 604_800_000 }, userId: OTHER_USER_ID }));

function makeCookie(sessionId: string): string {
	const sig = createHmac("sha256", SESSION_SECRET)
		.update(sessionId)
		.digest("base64")
		.replace(/=+$/, "");
	return `connect.sid=${encodeURIComponent(`s:${sessionId}.${sig}`)}`;
}
const AUTH_COOKIE = makeCookie(TEST_SESSION_ID);
const OTHER_AUTH_COOKIE = makeCookie(OTHER_SESSION_ID);

const app = createApp(testDb);

function req(method: "get" | "post" | "put" | "delete", url: string, cookie = AUTH_COOKIE) {
	return request(app)[method](url).set("Cookie", cookie);
}

afterEach(() => {
	testDb.exec("DELETE FROM jobs; DELETE FROM job_searches;");
});

const BASE_JOB = {
	company: "Acme Corp",
	date_applied: null,
	favorite: false,
	fit_score: null,
	link: "https://acme.example.com/jobs/1",
	notes: null,
	recruiter: null,
	referred_by: null,
	role: "Engineer",
	salary: null,
	status: "not_started",
};

describe("gET /api/jobs", () => {
	it("returns 200 with a list of jobs", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].company).toBe("Acme Corp");
	});

	describe("view param", () => {
		it("omits notes and job_description when view=summary", async () => {
			await req("post", "/api/jobs").send({
				...BASE_JOB,
				job_description: "job description text",
				notes: "some notes",
			});
			const res = await req("get", "/api/jobs?view=summary");
			expect(res.status).toBe(200);
			expect(res.body[0]).not.toHaveProperty("notes");
			expect(res.body[0]).not.toHaveProperty("job_description");
		});

		it("defaults to summary when view param is omitted", async () => {
			await req("post", "/api/jobs").send({
				...BASE_JOB,
				job_description: "job description text",
				notes: "some notes",
			});
			const res = await req("get", "/api/jobs");
			expect(res.status).toBe(200);
			expect(res.body[0]).not.toHaveProperty("notes");
			expect(res.body[0]).not.toHaveProperty("job_description");
		});

		it("includes notes and job_description when view=full", async () => {
			await req("post", "/api/jobs").send({
				...BASE_JOB,
				job_description: "job description text",
				notes: "some notes",
			});
			const res = await req("get", "/api/jobs?view=full");
			expect(res.status).toBe(200);
			expect(res.body[0].notes).toBe("some notes");
			expect(res.body[0].job_description).toBe("job description text");
		});

		it("falls back to summary for an unknown view value", async () => {
			await req("post", "/api/jobs").send({
				...BASE_JOB,
				notes: "some notes",
			});
			const res = await req("get", "/api/jobs?view=unknown");
			expect(res.status).toBe(200);
			expect(res.body[0]).not.toHaveProperty("notes");
		});
	});

	describe("search_id param", () => {
		it("returns 400 for a non-numeric search_id", async () => {
			const res = await req("get", "/api/jobs?search_id=not-a-number");
			expect(res.status).toBe(400);
		});

		it("returns 404 for a search_id that doesn't exist", async () => {
			const res = await req("get", "/api/jobs?search_id=9999");
			expect(res.status).toBe(404);
		});

		it("returns 404 for a search_id owned by a different user", async () => {
			const created = await req("post", "/api/job-searches").send({
				name: "Search 1",
			});
			const res = await req(
				"get",
				`/api/jobs?search_id=${created.body.id}`,
				OTHER_AUTH_COOKIE,
			);
			expect(res.status).toBe(404);
		});

		it("returns jobs scoped to a closed round, not the active one", async () => {
			const firstJob = await req("post", "/api/jobs").send({
				...BASE_JOB,
				ending_substatus: "Withdrawn",
				status: "rejected_or_withdrawn",
			});
			const firstSearchId = firstJob.body.search_id;

			await req("post", "/api/job-searches").send({ name: "Search 2" });
			await req("post", "/api/jobs").send({ ...BASE_JOB, company: "Second Co" });

			const historical = await req("get", `/api/jobs?search_id=${firstSearchId}`);
			expect(historical.status).toBe(200);
			expect(historical.body).toHaveLength(1);
			expect(historical.body[0].company).toBe("Acme Corp");

			const current = await req("get", "/api/jobs");
			expect(current.body).toHaveLength(1);
			expect(current.body[0].company).toBe("Second Co");
		});
	});
});

describe("gET /api/jobs/:jobId", () => {
	it("returns a single job by id", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const {id} = createRes.body;

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

describe("pOST /api/jobs", () => {
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

	it("defaults status to 'not_started' when not provided", async () => {
		const { status: _s, ...withoutStatus } = BASE_JOB;
		const res = await req("post", "/api/jobs").send(withoutStatus);
		expect(res.status).toBe(201);
		expect(res.body.status).toBe("not_started");
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
		expect(res.body.date_offer_extended).toBeNull();
	});

	it("returns 409 when a job with the same company and link already exists", async () => {
		await req("post", "/api/jobs").send(BASE_JOB);
		const second = await req("post", "/api/jobs").send(BASE_JOB);
		expect(second.status).toBe(409);
		expect(second.body).toStrictEqual({ error: "Job already exists" });
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

describe("pUT /api/jobs/:id", () => {
	it("updates an existing job and returns 200 with the updated record", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const {id} = createRes.body;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			company: "Updated Corp",
			referred_by: "Jane Doe",
			status: "applied",
		});
		expect(res.status).toBe(200);
		expect(res.body.company).toBe("Updated Corp");
		expect(res.body.status).toBe("applied");
		expect(res.body.referred_by).toBe("Jane Doe");
	});

	it("preserves notes and job_description when they are absent from the request body", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			job_description: "keep me too",
			notes: "keep me",
		});
		const {id} = createRes.body;

		// Update only status — notes/job_description intentionally omitted from body
		// (mirrors a summary-state client that never loaded those fields)
		const { notes: _n, ...withoutDetailFields } = BASE_JOB;
		const res = await req("put", `/api/jobs/${id}`).send({
			...withoutDetailFields,
			status: "phone_screen",
		});
		expect(res.status).toBe(200);
		expect(res.body.notes).toBe("keep me");
		expect(res.body.job_description).toBe("keep me too");
	});

	it("clears notes when null is explicitly sent", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			notes: "clear me",
		});
		const {id} = createRes.body;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			notes: null,
		});
		expect(res.status).toBe(200);
		expect(res.body.notes).toBeNull();
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999").send(BASE_JOB);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("returns 409 when the job is in a closed search round", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			ending_substatus: "Withdrawn",
			status: "rejected_or_withdrawn",
		});
		const { id } = createRes.body;
		await req("post", "/api/job-searches").send({ name: "Search 2" });

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			company: "Should Not Apply",
		});
		expect(res.status).toBe(409);

		const unchanged = await req("get", `/api/jobs/${id}`);
		expect(unchanged.body.company).toBe("Acme Corp");
	});
});

describe("dELETE /api/jobs/:id", () => {
	it("deletes a job and returns success", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const {id} = createRes.body;

		const res = await req("delete", `/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBeTruthy();
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("returns 409 when the job is in a closed search round", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			ending_substatus: "Withdrawn",
			status: "rejected_or_withdrawn",
		});
		const { id } = createRes.body;
		await req("post", "/api/job-searches").send({ name: "Search 2" });

		const res = await req("delete", `/api/jobs/${id}`);
		expect(res.status).toBe(409);

		const stillThere = await req("get", `/api/jobs/${id}`);
		expect(stillThere.status).toBe(200);
	});
});

describe("ending_substatus validation", () => {
	const NON_TERMINAL_CASES = [
		"not_started",
		"applied",
		"phone_screen",
		"interviewing",
	] as const;

	describe("pOST /api/jobs", () => {
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
					ending_substatus: "Vanished",
					status,
				});
				expect(res.status).toBe(422);
			},
		);

		it.each([...VALID_OFFER_SUBSTATUSES])(
			'accepts ending_substatus "%s" with Offer! status',
			async (ending_substatus) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					date_offer_extended: "2026-05-15",
					ending_substatus,
					status: "offer",
				});
				expect(res.status).toBe(201);
				expect(res.body.ending_substatus).toBe(ending_substatus);
			},
		);

		it.each([...VALID_REJECTED_SUBSTATUSES])(
			'accepts ending_substatus "%s" with Rejected/Withdrawn status',
			async (ending_substatus) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					ending_substatus,
					status: "rejected_or_withdrawn",
				});
				expect(res.status).toBe(201);
				expect(res.body.ending_substatus).toBe(ending_substatus);
			},
		);

		it("rejects a rejection substatus for Offer! status", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				ending_substatus: "Ghosted",
				status: "offer",
			});
			expect(res.status).toBe(422);
		});

		it("rejects an offer substatus for Rejected/Withdrawn status", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				ending_substatus: "Offer accepted",
				status: "rejected_or_withdrawn",
			});
			expect(res.status).toBe(422);
		});

		it.each(NON_TERMINAL_CASES)(
			'returns 422 when status is "%s" and ending_substatus is set',
			async (status) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					ending_substatus: "Ghosted",
					status,
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

	describe("pUT /api/jobs/:id", () => {
		it("returns 422 when updating to terminal status without ending_substatus", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				status: "rejected_or_withdrawn",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/ending_substatus is required/);
		});

		it("accepts a valid ending_substatus when updating to a terminal status", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				ending_substatus: "Ghosted",
				status: "rejected_or_withdrawn",
			});
			expect(res.status).toBe(200);
			expect(res.body.ending_substatus).toBe("Ghosted");
		});

		it("returns 422 when updating a non-terminal job with a non-null ending_substatus", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				ending_substatus: "Ghosted",
				status: "applied",
			});
			expect(res.status).toBe(422);
		});

		it("clears ending_substatus when moving from terminal back to non-terminal", async () => {
			const createRes = await req("post", "/api/jobs").send({
				...BASE_JOB,
				date_offer_extended: "2026-05-15",
				ending_substatus: "Offer accepted",
				status: "offer",
			});
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				date_offer_extended: null,
				status: "interviewing",
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
			date_last_onsite: "2026-03-23T09:00",
			date_phone_screen: "2026-03-20T10:00",
		});
		expect(res.status).toBe(201);
		expect(res.body.date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body.date_last_onsite).toBe("2026-03-23T09:00");
	});

	it("updates date fields via PUT", async () => {
		const createRes = await req("post", "/api/jobs").send(BASE_JOB);
		const {id} = createRes.body;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			date_last_onsite: "2026-03-23T09:00",
			date_phone_screen: "2026-03-20T10:00",
		});
		expect(res.status).toBe(200);
		expect(res.body.date_phone_screen).toBe("2026-03-20T10:00");
		expect(res.body.date_last_onsite).toBe("2026-03-23T09:00");
	});

	it("clears date fields when PUT sends null values", async () => {
		const createRes = await req("post", "/api/jobs").send({
			...BASE_JOB,
			date_last_onsite: "2026-03-23T09:00",
			date_phone_screen: "2026-03-20T10:00",
		});
		const {id} = createRes.body;

		const res = await req("put", `/api/jobs/${id}`).send({
			...BASE_JOB,
			date_last_onsite: null,
			date_phone_screen: null,
		});
		expect(res.status).toBe(200);
		expect(res.body.date_phone_screen).toBeNull();
		expect(res.body.date_last_onsite).toBeNull();
	});
});

describe("cover_letter_url field", () => {
	describe("pOST /api/jobs", () => {
		it("maps omitted cover_letter_url to null", async () => {
			const res = await req("post", "/api/jobs").send(BASE_JOB);
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBeNull();
		});

		it("stores a valid URL", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "https://docs.google.com/document/d/abc",
			});
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBe("https://docs.google.com/document/d/abc");
		});

		it("converts an empty string to null", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "",
			});
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBeNull();
		});

		it("converts a whitespace-only string to null", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "   ",
			});
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBeNull();
		});

		it("trims surrounding whitespace from a valid URL", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "  https://docs.google.com/document/d/abc  ",
			});
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBe("https://docs.google.com/document/d/abc");
		});

		it("returns 422 for a structurally invalid URL", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "not a url",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/cover_letter_url must be a valid URL/);
		});

		it("does not require liveness — an unreachable-looking URL is still accepted", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "https://docs.google.com/document/d/this-does-not-actually-exist",
			});
			expect(res.status).toBe(201);
		});
	});

	describe("pUT /api/jobs/:id", () => {
		it("updates cover_letter_url", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				cover_letter_url: "https://docs.google.com/document/d/abc",
			});
			expect(res.status).toBe(200);
			expect(res.body.cover_letter_url).toBe("https://docs.google.com/document/d/abc");
		});

		it("clears cover_letter_url back to null", async () => {
			const createRes = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: "https://docs.google.com/document/d/abc",
			});
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				cover_letter_url: "",
			});
			expect(res.status).toBe(200);
			expect(res.body.cover_letter_url).toBeNull();
		});

		it("returns 422 for a structurally invalid URL", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				cover_letter_url: "not a url",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/cover_letter_url must be a valid URL/);
		});
	});
});

describe("date_offer_extended validation", () => {
	const OFFER_BASE = {
		...BASE_JOB,
		ending_substatus: "Offer accepted",
		status: "offer",
	};

	describe("pOST /api/jobs", () => {
		it("returns 422 when status is Offer! and date_offer_extended is absent", async () => {
			const res = await req("post", "/api/jobs").send(OFFER_BASE);
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/date_offer_extended/);
		});

		it("returns 201 when status is Offer! and date_offer_extended is set", async () => {
			const res = await req("post", "/api/jobs").send({
				...OFFER_BASE,
				date_offer_extended: "2026-05-15",
			});
			expect(res.status).toBe(201);
			expect(res.body.date_offer_extended).toBe("2026-05-15");
		});

		it("returns 422 when status is non-Offer! and date_offer_extended is set", async () => {
			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				date_offer_extended: "2026-05-15",
				status: "applied",
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/date_offer_extended/);
		});
	});

	describe("pUT /api/jobs/:id", () => {
		it("returns 422 when updating to Offer! without date_offer_extended", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...OFFER_BASE,
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(/date_offer_extended/);
		});

		it("returns 200 when updating to Offer! with date_offer_extended", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...OFFER_BASE,
				date_offer_extended: "2026-05-15",
			});
			expect(res.status).toBe(200);
			expect(res.body.date_offer_extended).toBe("2026-05-15");
		});

		it("returns 422 when updating a non-Offer! job with date_offer_extended set", async () => {
			const createRes = await req("post", "/api/jobs").send(BASE_JOB);
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				date_offer_extended: "2026-05-15",
				status: "applied",
			});
			expect(res.status).toBe(422);
		});

		it("clears date_offer_extended when moving from Offer! to a non-terminal status", async () => {
			const createRes = await req("post", "/api/jobs").send({
				...OFFER_BASE,
				date_offer_extended: "2026-05-15",
			});
			const {id} = createRes.body;

			const res = await req("put", `/api/jobs/${id}`).send({
				...BASE_JOB,
				date_offer_extended: null,
				status: "interviewing",
			});
			expect(res.status).toBe(200);
			expect(res.body.date_offer_extended).toBeNull();
		});
	});
});

describe("field length validation", () => {
	const LENGTH_CASES = Object.entries(JOB_MAX_LENGTHS) as [
		keyof typeof JOB_MAX_LENGTHS,
		number,
	][];

	// Cover_letter_url must also be a structurally valid URL, so a repeated-character
	// String of the right length (used by the generic "accepts at exactly max" case
	// Below) doesn't apply to it — it gets its own boundary test further down.
	const NON_URL_LENGTH_CASES = LENGTH_CASES.filter(
		([field]) => field !== "cover_letter_url",
	);

	describe("pOST /api/jobs", () => {
		it.each(LENGTH_CASES)(
			"returns 422 when %s exceeds %d characters",
			async (field, max) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					[field]: "a".repeat(max + 1),
				});
				expect(res.status).toBe(422);
				expect(res.body.error).toMatch(new RegExp(field));
			},
		);

		it.each(NON_URL_LENGTH_CASES)(
			"accepts %s at exactly %d characters",
			async (field, max) => {
				const res = await req("post", "/api/jobs").send({
					...BASE_JOB,
					[field]: "a".repeat(max),
				});
				expect(res.status).toBe(201);
			},
		);

		it("accepts cover_letter_url at exactly the max length when it's a valid URL", async () => {
			const prefix = "https://example.com/";
			const url = prefix + "a".repeat(JOB_MAX_LENGTHS.cover_letter_url - prefix.length);
			expect(url).toHaveLength(JOB_MAX_LENGTHS.cover_letter_url);

			const res = await req("post", "/api/jobs").send({
				...BASE_JOB,
				cover_letter_url: url,
			});
			expect(res.status).toBe(201);
			expect(res.body.cover_letter_url).toBe(url);
		});
	});

	describe("pUT /api/jobs/:id", () => {
		it.each(LENGTH_CASES)(
			"returns 422 when %s exceeds %d characters",
			async (field, max) => {
				const createRes = await req("post", "/api/jobs").send(BASE_JOB);
				const {id} = createRes.body;

				const res = await req("put", `/api/jobs/${id}`).send({
					...BASE_JOB,
					[field]: "a".repeat(max + 1),
				});
				expect(res.status).toBe(422);
				expect(res.body.error).toMatch(new RegExp(field));
			},
		);
	});
});
