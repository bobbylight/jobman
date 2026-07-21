import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import { applySchema } from "../db.js";

const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const TEST_SESSION_ID = "test-session-offers-routes";
const OTHER_SESSION_ID = "test-session-offers-routes-other";
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
const ACTIVE_SEARCH_ID = Number(
	testDb.prepare("INSERT INTO job_searches (user_id, name) VALUES (?, 'Search 1')").run(TEST_USER_ID)
		.lastInsertRowid,
);
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
const OTHER_COOKIE = makeCookie(OTHER_SESSION_ID);

const app = createApp(testDb);

function req(method: "get" | "post" | "put" | "delete", url: string) {
	return request(app)[method](url).set("Cookie", AUTH_COOKIE);
}

const BASE_OFFER = {
	base_pay_amount: 150_000,
	target_bonus_percent: 15,
	equity_amount: 400_000,
	equity_vesting_years: 4,
	equity_type: "rsus",
	signing_bonus_amount: 20_000,
	wellness_stipend_amount: 1200,
	other_amount: null,
	other_label: null,
	other_is_recurring: false,
	k401_match_percent: 4,
	offer_deadline: "2026-07-01",
	notes: "Great package",
};

function insertJob(overrides: Record<string, unknown> = {}) {
	const result = testDb
		.prepare("INSERT INTO jobs (user_id, company, role, link, status, search_id) VALUES (?, ?, ?, ?, ?, ?)")
		.run(
			TEST_USER_ID,
			"Acme",
			"Engineer",
			"https://example.com/job/1",
			overrides.status ?? "offer",
			ACTIVE_SEARCH_ID,
		);
	return Number(result.lastInsertRowid);
}

afterEach(() => {
	testDb.exec("DELETE FROM offers");
	testDb.exec("DELETE FROM jobs");
});

describe("gET /api/jobs/:jobId/offer", () => {
	it("returns 401 when unauthenticated", async () => {
		const jobId = insertJob();
		const res = await request(app).get(`/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(401);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999/offer");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("returns 404 when job belongs to another user", async () => {
		const jobId = insertJob();
		const res = await request(app)
			.get(`/api/jobs/${jobId}/offer`)
			.set("Cookie", OTHER_COOKIE);
		expect(res.status).toBe(404);
	});

	it("returns 404 when no offer exists", async () => {
		const jobId = insertJob();
		const res = await req("get", `/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Offer not found");
	});

	it("returns 200 with the offer when it exists", async () => {
		const jobId = insertJob();
		testDb
			.prepare("INSERT INTO offers (job_id, base_pay_amount) VALUES (?, ?)")
			.run(jobId, 150_000);
		const res = await req("get", `/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(200);
		expect(res.body.job_id).toBe(jobId);
		expect(res.body.base_pay_amount).toBe(150_000);
	});
});

describe("pOST /api/jobs/:jobId/offer", () => {
	it("returns 401 when unauthenticated", async () => {
		const jobId = insertJob();
		const res = await request(app).post(`/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(401);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("post", "/api/jobs/99999/offer").send(BASE_OFFER);
		expect(res.status).toBe(404);
	});

	it("returns 404 when job belongs to another user", async () => {
		const jobId = insertJob();
		const res = await request(app)
			.post(`/api/jobs/${jobId}/offer`)
			.set("Cookie", OTHER_COOKIE)
			.send(BASE_OFFER);
		expect(res.status).toBe(404);
	});

	it("returns 400 when job is not in offer status", async () => {
		const jobId = insertJob({ status: "interviewing" });
		const res = await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/offer status/);
	});

	it("returns 409 when an offer already exists", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		const second = await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(second.status).toBe(409);
		expect(second.body.error).toMatch(/already exists/);
	});

	it("creates the offer and returns 201", async () => {
		const jobId = insertJob();
		const res = await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(201);
		expect(res.body.job_id).toBe(jobId);
		expect(res.body.base_pay_amount).toBe(150_000);
		expect(res.body.other_is_recurring).toBeFalsy();
		expect(res.body.equity_vesting_years).toBe(4);
	});

	it("coalesces null equity_vesting_years to 4", async () => {
		const jobId = insertJob();
		const res = await req("post", `/api/jobs/${jobId}/offer`).send({
			...BASE_OFFER,
			equity_vesting_years: null,
		});
		expect(res.status).toBe(201);
		expect(res.body.equity_vesting_years).toBe(4);
	});

	it("returns other_is_recurring as boolean true", async () => {
		const jobId = insertJob();
		const res = await req("post", `/api/jobs/${jobId}/offer`).send({
			...BASE_OFFER,
			other_is_recurring: true,
		});
		expect(res.status).toBe(201);
		expect(res.body.other_is_recurring).toBeTruthy();
	});

	it("stores null for all optional fields when body is empty", async () => {
		const jobId = insertJob();
		const res = await req("post", `/api/jobs/${jobId}/offer`).send({});
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({
			base_pay_amount: null,
			target_bonus_percent: null,
			equity_amount: null,
			equity_vesting_years: 4,
			equity_type: null,
			signing_bonus_amount: null,
			wellness_stipend_amount: null,
			other_amount: null,
			other_label: null,
			other_is_recurring: false,
			k401_match_percent: null,
			offer_deadline: null,
			notes: null,
		});
	});
});

describe("pUT /api/jobs/:jobId/offer", () => {
	it("returns 401 when unauthenticated", async () => {
		const jobId = insertJob();
		const res = await request(app).put(`/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(401);
	});

	it("returns 400 when job is not in offer status", async () => {
		const jobId = insertJob({ status: "applied" });
		const res = await req("put", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(400);
	});

	it("returns 404 when no offer exists to update", async () => {
		const jobId = insertJob();
		const res = await req("put", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Offer not found");
	});

	it("returns 404 when job belongs to another user", async () => {
		const jobId = insertJob();
		testDb.prepare("INSERT INTO offers (job_id) VALUES (?)").run(jobId);
		const res = await request(app)
			.put(`/api/jobs/${jobId}/offer`)
			.set("Cookie", OTHER_COOKIE)
			.send(BASE_OFFER);
		expect(res.status).toBe(404);
	});

	it("updates all fields and returns 200", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		const res = await req("put", `/api/jobs/${jobId}/offer`).send({
			...BASE_OFFER,
			base_pay_amount: 200_000,
			notes: "Updated",
		});
		expect(res.status).toBe(200);
		expect(res.body.base_pay_amount).toBe(200_000);
		expect(res.body.notes).toBe("Updated");
	});

	it("can null out fields (full replace)", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		const res = await req("put", `/api/jobs/${jobId}/offer`).send({
			...BASE_OFFER,
			base_pay_amount: null,
		});
		expect(res.status).toBe(200);
		expect(res.body.base_pay_amount).toBeNull();
	});

	it("stores null for all optional fields when body is empty", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		const res = await req("put", `/api/jobs/${jobId}/offer`).send({});
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			base_pay_amount: null,
			target_bonus_percent: null,
			equity_amount: null,
			equity_vesting_years: 4,
			equity_type: null,
			signing_bonus_amount: null,
			wellness_stipend_amount: null,
			other_amount: null,
			other_label: null,
			other_is_recurring: false,
			k401_match_percent: null,
			offer_deadline: null,
			notes: null,
		});
	});

	it("returns other_is_recurring as boolean true", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);
		const res = await req("put", `/api/jobs/${jobId}/offer`).send({
			...BASE_OFFER,
			other_is_recurring: true,
		});
		expect(res.status).toBe(200);
		expect(res.body.other_is_recurring).toBeTruthy();
	});
});

describe("dELETE /api/jobs/:jobId/offer", () => {
	it("returns 401 when unauthenticated", async () => {
		const jobId = insertJob();
		const res = await request(app).delete(`/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(401);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999/offer");
		expect(res.status).toBe(404);
	});

	it("returns 404 when job belongs to another user", async () => {
		const jobId = insertJob();
		testDb.prepare("INSERT INTO offers (job_id) VALUES (?)").run(jobId);
		const res = await request(app)
			.delete(`/api/jobs/${jobId}/offer`)
			.set("Cookie", OTHER_COOKIE);
		expect(res.status).toBe(404);
	});

	it("returns 404 when no offer exists", async () => {
		const jobId = insertJob();
		const res = await req("delete", `/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Offer not found");
	});

	it("deletes the offer and returns 204", async () => {
		const jobId = insertJob();
		testDb.prepare("INSERT INTO offers (job_id) VALUES (?)").run(jobId);
		const res = await req("delete", `/api/jobs/${jobId}/offer`);
		expect(res.status).toBe(204);

		// Confirm it's gone
		const getRes = await req("get", `/api/jobs/${jobId}/offer`);
		expect(getRes.status).toBe(404);
	});
});

describe("gET /api/offers", () => {
	it("returns 401 when unauthenticated", async () => {
		const res = await request(app).get("/api/offers");
		expect(res.status).toBe(401);
	});

	it("returns empty array when no jobs are in offer status", async () => {
		insertJob({ status: "applied" });
		const res = await req("get", "/api/offers");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(0);
	});

	it("returns jobs in offer status with null offer when none created", async () => {
		insertJob();
		const res = await req("get", "/api/offers");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].offer).toBeNull();
	});

	it("returns jobs in offer status with their offer", async () => {
		const jobId = insertJob();
		testDb
			.prepare("INSERT INTO offers (job_id, base_pay_amount) VALUES (?, ?)")
			.run(jobId, 180_000);
		const res = await req("get", "/api/offers");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].job.id).toBe(jobId);
		expect(res.body[0].offer.base_pay_amount).toBe(180_000);
	});

	it("does not return jobs belonging to other users", async () => {
		const result = testDb
			.prepare("INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)")
			.run(OTHER_USER_ID, "Other Co", "PM", "https://other.com", "offer");
		testDb.prepare("INSERT INTO offers (job_id) VALUES (?)").run(Number(result.lastInsertRowid));

		const res = await req("get", "/api/offers");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(0);
	});
});

describe("offer cascade delete on job status change", () => {
	it("deletes the offer when job moves away from offer status", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);

		// Verify offer exists
		let offerRes = await req("get", `/api/jobs/${jobId}/offer`);
		expect(offerRes.status).toBe(200);

		// Move job out of offer status
		await request(app)
			.put(`/api/jobs/${jobId}`)
			.set("Cookie", AUTH_COOKIE)
			.send({
				company: "Acme",
				role: "Engineer",
				link: "https://example.com/job/1",
				status: "rejected_or_withdrawn",
				ending_substatus: "Withdrawn",
				date_offer_extended: null,
				favorite: false,
				tags: [],
			});

		// Offer should be gone
		offerRes = await req("get", `/api/jobs/${jobId}/offer`);
		expect(offerRes.status).toBe(404);
	});

	it("does not delete the offer when job stays in offer status", async () => {
		const jobId = insertJob();
		await req("post", `/api/jobs/${jobId}/offer`).send(BASE_OFFER);

		await request(app)
			.put(`/api/jobs/${jobId}`)
			.set("Cookie", AUTH_COOKIE)
			.send({
				company: "Acme Updated",
				role: "Engineer",
				link: "https://example.com/job/1",
				status: "offer",
				ending_substatus: null,
				date_offer_extended: "2026-07-01",
				favorite: false,
				tags: [],
			});

		const offerRes = await req("get", `/api/jobs/${jobId}/offer`);
		expect(offerRes.status).toBe(200);
	});
});

describe("has_offer field on job list", () => {
	it("returns has_offer=false when no offer exists", async () => {
		insertJob();
		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body[0].has_offer).toBeFalsy();
	});

	it("returns has_offer=true when an offer exists", async () => {
		const jobId = insertJob();
		testDb.prepare("INSERT INTO offers (job_id) VALUES (?)").run(jobId);
		const res = await req("get", "/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body[0].has_offer).toBeTruthy();
	});
});
