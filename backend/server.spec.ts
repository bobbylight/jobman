import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "./server.js";
import { applySchema } from "./db.js";

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-server";
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
