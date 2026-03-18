import type { DatabaseSync } from "node:sqlite";
import request from "supertest";

// testDb is assigned inside the vi.mock factory, which runs before any test code.
let testDb!: DatabaseSync;

vi.mock("./db.js", async () => {
	const { DatabaseSync } = await import("node:sqlite");
	const db = new DatabaseSync(":memory:");
	db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
	testDb = db;
	return { default: db };
});

// Import after mock registration so server.ts gets the mocked db.
const { app } = await import("./server.js");

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
	beforeEach(() => {
		testDb.exec("DELETE FROM jobs");
	});

	it("returns an empty array when no jobs exist", async () => {
		const res = await request(app).get("/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("returns all jobs sorted by created_at DESC", async () => {
		testDb
			.prepare(
				"INSERT INTO jobs (company, role, link, created_at) VALUES (?, ?, ?, ?)",
			)
			.run("First Corp", "Dev", "https://a.com", "2024-01-01 00:00:00");
		testDb
			.prepare(
				"INSERT INTO jobs (company, role, link, created_at) VALUES (?, ?, ?, ?)",
			)
			.run("Second Corp", "PM", "https://b.com", "2024-01-02 00:00:00");

		const res = await request(app).get("/api/jobs");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0].company).toBe("Second Corp");
		expect(res.body[1].company).toBe("First Corp");
	});

	it("converts favorite from 0/1 to boolean", async () => {
		testDb
			.prepare(
				"INSERT INTO jobs (company, role, link, favorite) VALUES (?, ?, ?, ?)",
			)
			.run("Acme", "Dev", "https://a.com", 0);

		const res = await request(app).get("/api/jobs");
		expect(res.body[0].favorite).toBe(false);
	});
});

describe("POST /api/jobs", () => {
	beforeEach(() => {
		testDb.exec("DELETE FROM jobs");
	});

	it("creates a job and returns 201 with the created record", async () => {
		const res = await request(app).post("/api/jobs").send(BASE_JOB);
		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.company).toBe("Acme Corp");
		expect(res.body.role).toBe("Engineer");
	});

	it("defaults status to 'Not started' when not provided", async () => {
		const { status: _s, ...withoutStatus } = BASE_JOB;
		const res = await request(app).post("/api/jobs").send(withoutStatus);
		expect(res.status).toBe(201);
		expect(res.body.status).toBe("Not started");
	});

	it("stores referred_by name and converts favorite to boolean in the response", async () => {
		const res = await request(app)
			.post("/api/jobs")
			.send({ ...BASE_JOB, referred_by: "Jane Doe", favorite: true });
		expect(res.status).toBe(201);
		expect(res.body.referred_by).toBe("Jane Doe");
		expect(res.body.favorite).toBe(true);
	});

	it("stores null for optional fields when omitted", async () => {
		const res = await request(app).post("/api/jobs").send(BASE_JOB);
		expect(res.body.salary).toBeNull();
		expect(res.body.fit_score).toBeNull();
		expect(res.body.recruiter).toBeNull();
		expect(res.body.notes).toBeNull();
	});
});

describe("PUT /api/jobs/:id", () => {
	beforeEach(() => {
		testDb.exec("DELETE FROM jobs");
	});

	it("updates an existing job and returns the updated record", async () => {
		const createRes = await request(app).post("/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await request(app)
			.put(`/api/jobs/${id}`)
			.send({ ...BASE_JOB, company: "Updated Corp", status: "Resume submitted" });

		expect(res.status).toBe(200);
		expect(res.body.company).toBe("Updated Corp");
		expect(res.body.status).toBe("Resume submitted");
	});

	it("returns 404 when job does not exist", async () => {
		const res = await request(app)
			.put("/api/jobs/99999")
			.send({ ...BASE_JOB, company: "Ghost" });
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("updates referred_by and favorite correctly", async () => {
		const createRes = await request(app).post("/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await request(app)
			.put(`/api/jobs/${id}`)
			.send({ ...BASE_JOB, referred_by: "Jane Doe", favorite: true });

		expect(res.body.referred_by).toBe("Jane Doe");
		expect(res.body.favorite).toBe(true);
	});
});

describe("DELETE /api/jobs/:id", () => {
	beforeEach(() => {
		testDb.exec("DELETE FROM jobs");
	});

	it("deletes a job and returns success", async () => {
		const createRes = await request(app).post("/api/jobs").send(BASE_JOB);
		const id: number = createRes.body.id;

		const res = await request(app).delete(`/api/jobs/${id}`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);

		const getRes = await request(app).get("/api/jobs");
		expect(getRes.body).toHaveLength(0);
	});

	it("returns 404 when job does not exist", async () => {
		const res = await request(app).delete("/api/jobs/99999");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});
