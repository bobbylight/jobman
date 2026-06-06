import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import { applySchema } from "../db.js";

const SESSION_SECRET = "dev-secret";
const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-radar-routes";

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
testDb
	.prepare("INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))")
	.run(TEST_SESSION_ID, JSON.stringify({ cookie: { originalMaxAge: 604_800_000 }, userId: TEST_USER_ID }));

const sig = createHmac("sha256", SESSION_SECRET)
	.update(TEST_SESSION_ID)
	.digest("base64")
	.replace(/=+$/, "");
const AUTH_COOKIE = `connect.sid=${encodeURIComponent(`s:${TEST_SESSION_ID}.${sig}`)}`;

const app = createApp(testDb);

function req(method: "get" | "patch", url: string) {
	return request(app)[method](url).set("Cookie", AUTH_COOKIE);
}

function insertCompany(overrides: { name?: string; hidden?: number } = {}) {
	const result = testDb
		.prepare("INSERT INTO target_companies (name, hidden) VALUES (?, ?)")
		.run(overrides.name ?? "Acme", overrides.hidden ?? 0) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

function insertJob(overrides: { company?: string; status?: string; date_applied?: string | null } = {}) {
	const result = testDb
		.prepare(
			"INSERT INTO jobs (user_id, company, role, link, status, date_applied) VALUES (?, ?, 'Engineer', 'https://example.com', ?, ?)",
		)
		.run(
			TEST_USER_ID,
			overrides.company ?? "Acme",
			overrides.status ?? "applied",
			overrides.date_applied ?? null,
		) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

function daysAgo(n: number): string {
	return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

afterEach(() => {
	testDb.exec("DELETE FROM jobs; DELETE FROM target_companies;");
});

describe("gET /api/radar", () => {
	it("returns 401 when not authenticated", async () => {
		const res = await request(app).get("/api/radar");
		expect(res.status).toBe(401);
	});

	it("returns a radar response with entries and generated_at", async () => {
		const id = insertCompany({ name: "Acme" });
		insertJob({ company: "Acme", status: "applied", date_applied: daysAgo(5) });
		const res = await req("get", "/api/radar");
		expect(res.status).toBe(200);
		expect(res.body.generated_at).toBeTruthy();
		expect(res.body.entries).toHaveLength(1);
		expect(res.body.entries[0].id).toBe(id);
		expect(res.body.entries[0].name).toBe("Acme");
	});

	it("excludes hidden companies by default", async () => {
		insertCompany({ name: "Acme", hidden: 1 });
		insertJob({ company: "Acme", status: "applied" });
		const res = await req("get", "/api/radar");
		expect(res.status).toBe(200);
		expect(res.body.entries).toHaveLength(0);
	});

	it("includes hidden companies when includeHidden=true", async () => {
		insertCompany({ name: "Acme", hidden: 1 });
		insertJob({ company: "Acme", status: "applied" });
		const res = await req("get", "/api/radar?includeHidden=true");
		expect(res.status).toBe(200);
		expect(res.body.entries).toHaveLength(1);
		expect(res.body.entries[0].hidden).toBeTruthy();
	});
});

describe("pATCH /api/radar/:id", () => {
	it("returns 401 when not authenticated", async () => {
		const id = insertCompany();
		const res = await request(app).patch(`/api/radar/${id}`).send({ hidden: 1 });
		expect(res.status).toBe(401);
	});

	it("updates a target company field and returns success", async () => {
		const id = insertCompany();
		const res = await req("patch", `/api/radar/${id}`).send({ hidden: 1, user_notes: "Important" });
		expect(res.status).toBe(200);
		expect(res.body.success).toBeTruthy();
		const row = testDb
			.prepare("SELECT hidden, user_notes FROM target_companies WHERE id = ?")
			.get(id) as { hidden: number; user_notes: string };
		expect(row.hidden).toBe(1);
		expect(row.user_notes).toBe("Important");
	});

	it("returns 400 for a non-numeric id", async () => {
		const res = await req("patch", "/api/radar/not-a-number").send({ hidden: 1 });
		expect(res.status).toBe(400);
		expect(res.body.error).toBe("Invalid id");
	});

	it("returns 404 when the target company does not exist", async () => {
		const res = await req("patch", "/api/radar/9999").send({ hidden: 1 });
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Not found");
	});

	it("returns 404 when the patch body contains no allowlisted fields", async () => {
		const id = insertCompany();
		const res = await req("patch", `/api/radar/${id}`).send({ bogus_field: "value" });
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Not found");
	});
});
