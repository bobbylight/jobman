import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  );
`;

const SESSION_SECRET = "dev-secret";

function signSession(id: string): string {
	const sig = createHmac("sha256", SESSION_SECRET)
		.update(id)
		.digest("base64")
		.replace(/=+$/, "");
	return `connect.sid=${encodeURIComponent(`s:${id}.${sig}`)}`;
}

function insertSession(db: Database.Database, id: string, userId: number) {
	db.prepare("INSERT OR IGNORE INTO sessions (sid, sess, expire) VALUES (?, ?, datetime('now', '+7 days'))").run(
		id,
		JSON.stringify({ cookie: { originalMaxAge: 604_800_000 }, userId }),
	);
}

const testDb = new Database(":memory:");
testDb.exec(SCHEMA);

const TEST_USER_ID = 1;
testDb
	.prepare("INSERT INTO users (id, email, display_name, avatar_url) VALUES (?, ?, ?, ?)")
	.run(TEST_USER_ID, "user@example.com", "Test User", "https://example.com/avatar.jpg");

insertSession(testDb, "test-session-auth", TEST_USER_ID);
const AUTH_COOKIE = signSession("test-session-auth");

const app = createApp(testDb);

describe("gET /api/auth/me", () => {
	it("returns 401 when no session cookie is present", async () => {
		const res = await request(app).get("/api/auth/me");
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("returns 401 when session references a non-existent user", async () => {
		insertSession(testDb, "orphan-session", 9999);
		const res = await request(app).get("/api/auth/me").set("Cookie", signSession("orphan-session"));
		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("returns user info for an authenticated session", async () => {
		const res = await request(app).get("/api/auth/me").set("Cookie", AUTH_COOKIE);
		expect(res.status).toBe(200);
		expect(res.body).toStrictEqual({
			avatarUrl: "https://example.com/avatar.jpg",
			displayName: "Test User",
			email: "user@example.com",
			id: TEST_USER_ID,
		});
	});

	it("returns null for optional fields when user has none set", async () => {
		testDb.prepare("INSERT INTO users (id, email) VALUES (2, 'sparse@example.com')").run();
		insertSession(testDb, "sparse-user-session", 2);
		const res = await request(app).get("/api/auth/me").set("Cookie", signSession("sparse-user-session"));
		expect(res.status).toBe(200);
		expect(res.body.displayName).toBeNull();
		expect(res.body.avatarUrl).toBeNull();
	});
});

describe("pOST /api/auth/logout", () => {
	it("returns success when called without a session", async () => {
		const res = await request(app).post("/api/auth/logout");
		expect(res.status).toBe(200);
		expect(res.body.success).toBeTruthy();
	});

	it("destroys the session so subsequent requests to /me return 401", async () => {
		insertSession(testDb, "logout-test-session", TEST_USER_ID);
		const cookie = signSession("logout-test-session");

		const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
		expect(logoutRes.status).toBe(200);
		expect(logoutRes.body.success).toBeTruthy();

		const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
		expect(meRes.status).toBe(401);
	});
});
