import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import { applySchema } from "../db.js";

const SESSION_SECRET = "dev-secret";
const TEST_USER_ID = 1;
const OTHER_USER_ID = 2;
const TEST_SESSION_ID = "test-session-job-searches-routes";
const OTHER_SESSION_ID = "test-session-job-searches-routes-other";

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
	.prepare("INSERT INTO users (id, email) VALUES (?, ?)")
	.run(OTHER_USER_ID, "other@test.com");
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
testDb
	.prepare(
		"INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))",
	)
	.run(
		OTHER_SESSION_ID,
		JSON.stringify({
			cookie: { originalMaxAge: 604_800_000 },
			userId: OTHER_USER_ID,
		}),
	);

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

function req(method: "get" | "post" | "patch", url: string, cookie = AUTH_COOKIE) {
	return request(app)[method](url).set("Cookie", cookie);
}

function insertJob(
	overrides: { status?: string; search_id?: number | null } = {},
) {
	const result = testDb
		.prepare(
			"INSERT INTO jobs (user_id, company, role, link, status, search_id) VALUES (?, 'Acme', 'Engineer', 'https://example.com', ?, ?)",
		)
		.run(
			TEST_USER_ID,
			overrides.status ?? "applied",
			overrides.search_id ?? null,
		) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

afterEach(() => {
	testDb.exec("DELETE FROM jobs; DELETE FROM job_searches;");
});

describe("gET /api/job-searches", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await request(app).get("/api/job-searches");
		expect(res.status).toBe(401);
	});

	it("returns rounds newest first", async () => {
		await req("post", "/api/job-searches").send({ name: "Search 1" });
		await req("post", "/api/job-searches").send({ name: "Search 2" });
		const res = await req("get", "/api/job-searches");
		expect(res.status).toBe(200);
		expect(res.body.map((r: { name: string }) => r.name)).toStrictEqual([
			"Search 2",
			"Search 1",
		]);
	});
});

describe("gET /api/job-searches/active", () => {
	it("returns 404 when the user has no active round", async () => {
		const res = await req("get", "/api/job-searches/active");
		expect(res.status).toBe(404);
	});

	it("returns the active round", async () => {
		await req("post", "/api/job-searches").send({ name: "Search 1" });
		const res = await req("get", "/api/job-searches/active");
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Search 1");
	});
});

describe("gET /api/job-searches/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await request(app).get("/api/job-searches/1");
		expect(res.status).toBe(401);
	});

	it("returns 400 for a non-numeric id", async () => {
		const res = await req("get", "/api/job-searches/not-a-number");
		expect(res.status).toBe(400);
	});

	it("returns 404 when the round does not exist", async () => {
		const res = await req("get", "/api/job-searches/9999");
		expect(res.status).toBe(404);
	});

	it("returns a closed round by id", async () => {
		const first = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		insertJob({ status: "offer", search_id: first.body.id });
		await req("post", "/api/job-searches").send({ name: "Search 2" });

		const res = await req("get", `/api/job-searches/${first.body.id}`);
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Search 1");
		expect(res.body.closed_at).not.toBeNull();
	});

	it("returns 404 for a round owned by a different user", async () => {
		const created = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		const res = await req(
			"get",
			`/api/job-searches/${created.body.id}`,
			OTHER_AUTH_COOKIE,
		);
		expect(res.status).toBe(404);
	});
});

describe("pOST /api/job-searches", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await request(app)
			.post("/api/job-searches")
			.send({ name: "Search 1" });
		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		const res = await req("post", "/api/job-searches").send({});
		expect(res.status).toBe(400);
	});

	it("creates the first round when the user has none yet", async () => {
		const res = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		expect(res.status).toBe(201);
		expect(res.body.name).toBe("Search 1");
		expect(res.body.closed_at).toBeNull();
	});

	it("closes the active round and opens a new one when all jobs are terminal", async () => {
		const first = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		insertJob({ status: "offer", search_id: first.body.id });

		const res = await req("post", "/api/job-searches").send({
			name: "Search 2",
		});
		expect(res.status).toBe(201);
		expect(res.body.name).toBe("Search 2");

		const active = await req("get", "/api/job-searches/active");
		expect(active.body.id).toBe(res.body.id);
	});

	it("returns 409 with blocking jobs when the active round has non-terminal jobs", async () => {
		const first = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		insertJob({ status: "applied", search_id: first.body.id });

		const res = await req("post", "/api/job-searches").send({
			name: "Search 2",
		});
		expect(res.status).toBe(409);
		expect(res.body.blockingJobs).toHaveLength(1);

		const active = await req("get", "/api/job-searches/active");
		expect(active.body.id).toBe(first.body.id);
	});
});

describe("pATCH /api/job-searches/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await request(app)
			.patch("/api/job-searches/1")
			.send({ name: "Renamed" });
		expect(res.status).toBe(401);
	});

	it("returns 400 for a non-numeric id", async () => {
		const res = await req("patch", "/api/job-searches/not-a-number").send({
			name: "Renamed",
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 when name is missing", async () => {
		const created = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		const res = await req("patch", `/api/job-searches/${created.body.id}`).send(
			{},
		);
		expect(res.status).toBe(400);
	});

	it("renames a round and updates notes", async () => {
		const created = await req("post", "/api/job-searches").send({
			name: "Search 1",
		});
		const res = await req("patch", `/api/job-searches/${created.body.id}`).send(
			{
				name: "Renamed",
				notes: "some notes",
			},
		);
		expect(res.status).toBe(200);
		expect(res.body.name).toBe("Renamed");
		expect(res.body.notes).toBe("some notes");
	});

	it("returns 404 when the round does not exist", async () => {
		const res = await req("patch", "/api/job-searches/9999").send({
			name: "Renamed",
		});
		expect(res.status).toBe(404);
	});
});
