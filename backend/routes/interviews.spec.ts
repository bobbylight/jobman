import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "../server.js";
import {
	INTERVIEW_MAX_LENGTHS,
	QUESTION_MAX_LENGTHS,
	VALID_INTERVIEW_STAGES,
	VALID_INTERVIEW_VIBES,
	VALID_QUESTION_TYPES,
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
    interview_stage TEXT NOT NULL,
    interview_dttm TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_type TEXT,
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
  CREATE TABLE IF NOT EXISTS job_tags (
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag    TEXT NOT NULL,
    PRIMARY KEY (job_id, tag)
  );

  CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);
`;

const TEST_USER_ID = 1;
const TEST_SESSION_ID = "test-session-interviews-routes";
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
	testDb.exec("DELETE FROM interview_questions");
	testDb.exec("DELETE FROM interviews");
	testDb.exec("DELETE FROM jobs");
});

const BASE_JOB = {
	company: "Acme Corp",
	role: "Engineer",
	link: "https://acme.example.com/jobs/1",
	status: "Not started",
	favorite: false,
};

const BASE_INTERVIEW = {
	interview_stage: "phone_screen",
	interview_dttm: "2026-04-01T10:00",
};

const BASE_QUESTION = {
	question_type: "behavioral",
	question_text: "Tell me about a time you led a project.",
	difficulty: 3,
};

async function createJob() {
	const res = await req("post", "/api/jobs").send(BASE_JOB);
	return res.body.id as number;
}

async function createJobAndInterview() {
	const jobId = await createJob();
	const interviewRes = await req("post", `/api/jobs/${jobId}/interviews`).send(BASE_INTERVIEW);
	return { jobId, interviewId: interviewRes.body.id as number };
}

async function createJobInterviewAndQuestion() {
	const { jobId, interviewId } = await createJobAndInterview();
	const questionRes = await req(
		"post",
		`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
	).send(BASE_QUESTION);
	return { jobId, interviewId, questionId: questionRes.body.id as number };
}

// --- Interview routes ---

describe("GET /api/jobs/:jobId/interviews", () => {
	it("returns 200 with the job's interviews", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send(BASE_INTERVIEW);

		const res = await req("get", `/api/jobs/${jobId}/interviews`);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].interview_stage).toBe("phone_screen");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999/interviews");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});
});

describe("POST /api/jobs/:jobId/interviews", () => {
	it("creates an interview and returns 201 with the record", async () => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_interviewers: "Alice, Bob",
			interview_vibe: "casual",
			interview_notes: "Went well",
		});

		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.job_id).toBe(jobId);
		expect(res.body.interview_stage).toBe("phone_screen");
		expect(res.body.interview_interviewers).toBe("Alice, Bob");
		expect(res.body.interview_vibe).toBe("casual");
		expect(res.body.interview_notes).toBe("Went well");
	});

	it("maps omitted optional fields to null", async () => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(BASE_INTERVIEW);
		expect(res.status).toBe(201);
		expect(res.body.interview_interviewers).toBeNull();
		expect(res.body.interview_vibe).toBeNull();
		expect(res.body.interview_notes).toBeNull();
	});

	it("returns 422 when interview_stage is missing", async () => {
		const jobId = await createJob();
		const { interview_stage: _t, ...withoutType } = BASE_INTERVIEW;
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(withoutType);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_stage/);
	});

	it("returns 422 when interview_stage is invalid", async () => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_stage: "video_call",
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_stage/);
	});

	it("returns 422 when interview_dttm is missing", async () => {
		const jobId = await createJob();
		const { interview_dttm: _d, ...withoutDttm } = BASE_INTERVIEW;
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send(withoutDttm);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_dttm/);
	});

	it("returns 422 when interview_vibe is invalid", async () => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_vibe: "stressed",
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/interview_vibe/);
	});

	it.each([...VALID_INTERVIEW_STAGES])('accepts interview_stage "%s"', async (interview_stage) => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_stage,
		});
		expect(res.status).toBe(201);
		expect(res.body.interview_stage).toBe(interview_stage);
	});

	it.each([...VALID_INTERVIEW_VIBES])('accepts interview_vibe "%s"', async (interview_vibe) => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_vibe,
		});
		expect(res.status).toBe(201);
		expect(res.body.interview_vibe).toBe(interview_vibe);
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("post", "/api/jobs/99999/interviews").send(BASE_INTERVIEW);
		expect(res.status).toBe(404);
	});

	it("returns 422 when job_id in body does not match :jobId in route", async () => {
		const jobId = await createJob();
		const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			job_id: jobId + 1,
		});
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/job_id/);
	});
});

describe("PUT /api/jobs/:jobId/interviews/:interviewId", () => {
	it("updates an interview and returns 200 with the updated record", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req("put", `/api/jobs/${jobId}/interviews/${interviewId}`).send({
			...BASE_INTERVIEW,
			interview_stage: "onsite",
			interview_vibe: "intense",
			interview_notes: "Updated notes",
		});

		expect(res.status).toBe(200);
		expect(res.body.interview_stage).toBe("onsite");
		expect(res.body.interview_vibe).toBe("intense");
		expect(res.body.interview_notes).toBe("Updated notes");
	});

	it("returns 404 when interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req("put", `/api/jobs/${jobId}/interviews/99999`).send(BASE_INTERVIEW);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Interview not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999/interviews/1").send(BASE_INTERVIEW);
		expect(res.status).toBe(404);
	});

	it("returns 422 when interview_stage is invalid", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req("put", `/api/jobs/${jobId}/interviews/${interviewId}`).send({
			...BASE_INTERVIEW,
			interview_stage: "video_call",
		});
		expect(res.status).toBe(422);
	});
});

describe("DELETE /api/jobs/:jobId/interviews/:interviewId", () => {
	it("deletes an interview and returns success", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req("delete", `/api/jobs/${jobId}/interviews/${interviewId}`);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
	});

	it("returns 404 when interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req("delete", `/api/jobs/${jobId}/interviews/99999`);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Interview not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999/interviews/1");
		expect(res.status).toBe(404);
	});
});

// --- Question routes ---

describe("GET /api/jobs/:jobId/interviews/:interviewId/questions", () => {
	it("returns 200 with the interview's questions", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		await req("post", `/api/jobs/${jobId}/interviews/${interviewId}/questions`).send(BASE_QUESTION);

		const res = await req("get", `/api/jobs/${jobId}/interviews/${interviewId}/questions`);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999/interviews/1/questions");
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Job not found");
	});

	it("returns 404 when the interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req("get", `/api/jobs/${jobId}/interviews/99999/questions`);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Interview not found");
	});
});

describe("GET /api/jobs/:jobId/interviews/:interviewId/questions/:questionId", () => {
	it("returns a single question by id", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const createRes = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(BASE_QUESTION);
		const questionId: number = createRes.body.id;

		const res = await req(
			"get",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
		);
		expect(res.status).toBe(200);
		expect(res.body.id).toBe(questionId);
		expect(res.body.question_type).toBe("behavioral");
		expect(res.body.difficulty).toBe(3);
	});

	it("returns 404 when the question does not exist", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"get",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/99999`,
		);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Question not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("get", "/api/jobs/99999/interviews/1/questions/1");
		expect(res.status).toBe(404);
	});

	it("returns 404 when the interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req("get", `/api/jobs/${jobId}/interviews/99999/questions/1`);
		expect(res.status).toBe(404);
	});
});

describe("POST /api/jobs/:jobId/interviews/:interviewId/questions", () => {
	it("creates a question and returns 201 with the record", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send({
			...BASE_QUESTION,
			question_notes: "Answered poorly, need to practice STAR method",
		});

		expect(res.status).toBe(201);
		expect(res.body.id).toBeTypeOf("number");
		expect(res.body.interview_id).toBe(interviewId);
		expect(res.body.question_type).toBe("behavioral");
		expect(res.body.question_notes).toBe("Answered poorly, need to practice STAR method");
		expect(res.body.difficulty).toBe(3);
	});

	it("maps omitted question_notes to null", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(BASE_QUESTION);
		expect(res.status).toBe(201);
		expect(res.body.question_notes).toBeNull();
	});

	it("returns 422 when question_type is missing", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const { question_type: _t, ...withoutType } = BASE_QUESTION;
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(withoutType);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/question_type/);
	});

	it("returns 422 when question_type is invalid", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send({ ...BASE_QUESTION, question_type: "brainteaser" });
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/question_type/);
	});

	it("returns 422 when question_text is missing", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const { question_text: _qt, ...withoutText } = BASE_QUESTION;
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(withoutText);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/question_text/);
	});

	it("returns 422 when difficulty is missing", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const { difficulty: _d, ...withoutDifficulty } = BASE_QUESTION;
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(withoutDifficulty);
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/difficulty/);
	});

	it("returns 422 when difficulty is out of range", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send({ ...BASE_QUESTION, difficulty: 6 });
		expect(res.status).toBe(422);
		expect(res.body.error).toMatch(/difficulty/);
	});

	it.each([1, 2, 3, 4, 5])("accepts difficulty %d", async (difficulty) => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send({ ...BASE_QUESTION, difficulty });
		expect(res.status).toBe(201);
		expect(res.body.difficulty).toBe(difficulty);
	});

	it.each([...VALID_QUESTION_TYPES])('accepts question_type "%s"', async (question_type) => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send({ ...BASE_QUESTION, question_type });
		expect(res.status).toBe(201);
		expect(res.body.question_type).toBe(question_type);
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("post", "/api/jobs/99999/interviews/1/questions").send(BASE_QUESTION);
		expect(res.status).toBe(404);
	});

	it("returns 404 when the interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req(
			"post",
			`/api/jobs/${jobId}/interviews/99999/questions`,
		).send(BASE_QUESTION);
		expect(res.status).toBe(404);
	});
});

describe("PUT /api/jobs/:jobId/interviews/:interviewId/questions/:questionId", () => {
	it("updates a question and returns 200 with the updated record", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const createRes = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(BASE_QUESTION);
		const questionId: number = createRes.body.id;

		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
		).send({
			...BASE_QUESTION,
			question_type: "technical",
			question_text: "Explain the CAP theorem.",
			question_notes: "Studied this",
			difficulty: 5,
		});

		expect(res.status).toBe(200);
		expect(res.body.question_type).toBe("technical");
		expect(res.body.question_text).toBe("Explain the CAP theorem.");
		expect(res.body.question_notes).toBe("Studied this");
		expect(res.body.difficulty).toBe(5);
	});

	it("returns 404 when the question does not exist", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/99999`,
		).send(BASE_QUESTION);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Question not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("put", "/api/jobs/99999/interviews/1/questions/1").send(BASE_QUESTION);
		expect(res.status).toBe(404);
	});

	it("returns 404 when the interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/99999/questions/1`,
		).send(BASE_QUESTION);
		expect(res.status).toBe(404);
	});

	it("returns 422 when question_type is invalid", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const createRes = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(BASE_QUESTION);
		const questionId: number = createRes.body.id;

		const res = await req(
			"put",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
		).send({ ...BASE_QUESTION, question_type: "brainteaser" });
		expect(res.status).toBe(422);
	});
});

describe("DELETE /api/jobs/:jobId/interviews/:interviewId/questions/:questionId", () => {
	it("deletes a question and returns success", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const createRes = await req(
			"post",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
		).send(BASE_QUESTION);
		const questionId: number = createRes.body.id;

		const res = await req(
			"delete",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
		);
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
	});

	it("returns 404 when the question does not exist", async () => {
		const { jobId, interviewId } = await createJobAndInterview();
		const res = await req(
			"delete",
			`/api/jobs/${jobId}/interviews/${interviewId}/questions/99999`,
		);
		expect(res.status).toBe(404);
		expect(res.body.error).toBe("Question not found");
	});

	it("returns 404 when the job does not exist", async () => {
		const res = await req("delete", "/api/jobs/99999/interviews/1/questions/1");
		expect(res.status).toBe(404);
	});

	it("returns 404 when the interview does not exist", async () => {
		const jobId = await createJob();
		const res = await req(
			"delete",
			`/api/jobs/${jobId}/interviews/99999/questions/1`,
		);
		expect(res.status).toBe(404);
	});
});

// --- GET /api/interviews (cross-job interview search) ---

describe("GET /api/interviews", () => {
	it("returns 200 with an empty array when there are no interviews", async () => {
		const res = await req("get", "/api/interviews");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("returns enriched interviews with a nested job object", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_interviewers: "Alice",
			interview_vibe: "casual",
		});

		const res = await req("get", "/api/interviews");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		const interview = res.body[0];
		expect(interview.interview_stage).toBe("phone_screen");
		expect(interview.interview_interviewers).toBe("Alice");
		expect(interview.interview_vibe).toBe("casual");
		expect(interview.job).toMatchObject({
			id: jobId,
			company: BASE_JOB.company,
			role: BASE_JOB.role,
			link: BASE_JOB.link,
		});
	});

	it("returns interviews ordered by interview_dttm ascending", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-04-20T10:00",
		});
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-04-05T10:00",
		});

		const res = await req("get", "/api/interviews");
		expect(res.status).toBe(200);
		expect(res.body[0].interview_dttm).toBe("2026-04-05T10:00");
		expect(res.body[1].interview_dttm).toBe("2026-04-20T10:00");
	});

	it("filters to interviews on or after ?from", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-03-01T10:00",
		});
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-04-15T10:00",
		});

		const res = await req("get", "/api/interviews?from=2026-04-01T00:00:00");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].interview_dttm).toBe("2026-04-15T10:00");
	});

	it("filters to interviews on or before ?to", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-03-01T10:00",
		});
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-04-15T10:00",
		});

		const res = await req("get", "/api/interviews?to=2026-04-01T23:59:59");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].interview_dttm).toBe("2026-03-01T10:00");
	});

	it("filters to interviews within a ?from+?to range", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-03-01T10:00",
		});
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-04-10T10:00",
		});
		await req("post", `/api/jobs/${jobId}/interviews`).send({
			...BASE_INTERVIEW,
			interview_dttm: "2026-05-01T10:00",
		});

		const res = await req(
			"get",
			"/api/interviews?from=2026-04-01T00:00:00&to=2026-04-30T23:59:59",
		);
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].interview_dttm).toBe("2026-04-10T10:00");
	});

	it("returns 400 for an invalid ?from value", async () => {
		const res = await req("get", "/api/interviews?from=not-a-date");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/from/);
	});

	it("returns 400 for an invalid ?to value", async () => {
		const res = await req("get", "/api/interviews?to=not-a-date");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/to/);
	});

	it("only returns interviews belonging to the authenticated user", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send(BASE_INTERVIEW);

		// Insert a job + interview for a different user directly
		testDb
			.prepare(
				"INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)",
			)
			.run(2, "Other Corp", "PM", "https://other.example.com", "Not started");
		const otherJobId = (
			testDb.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }
		).id;
		testDb
			.prepare(
				"INSERT INTO interviews (job_id, interview_stage, interview_dttm) VALUES (?, ?, ?)",
			)
			.run(otherJobId, "phone_screen", "2026-04-02T14:00");

		const res = await req("get", "/api/interviews");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].job.company).toBe(BASE_JOB.company);
	});

	it("returns 401 when unauthenticated", async () => {
		const res = await request(app).get("/api/interviews");
		expect(res.status).toBe(401);
	});
});

describe("GET /api/interviews — cursor pagination (?after + ?limit)", () => {
	it("returns interviews strictly after ?after", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-01T10:00" });
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-02T10:00" });
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-03T10:00" });

		const res = await req("get", "/api/interviews?after=2026-04-01T10:00");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0].interview_dttm).toBe("2026-04-02T10:00");
		expect(res.body[1].interview_dttm).toBe("2026-04-03T10:00");
	});

	it("does not return the interview at exactly the cursor dttm", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-01T10:00" });

		const res = await req("get", "/api/interviews?after=2026-04-01T10:00");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(0);
	});

	it("returns at most ?limit interviews", async () => {
		const jobId = await createJob();
		for (let i = 1; i <= 5; i++) {
			await req("post", `/api/jobs/${jobId}/interviews`).send({
				...BASE_INTERVIEW,
				interview_dttm: `2026-04-0${i}T10:00`,
			});
		}

		const res = await req("get", "/api/interviews?after=2026-01-01T00:00:00&limit=2");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
	});

	it("uses the default page size (10) when ?limit is omitted", async () => {
		const jobId = await createJob();
		for (let i = 1; i <= 15; i++) {
			const day = String(i).padStart(2, "0");
			await req("post", `/api/jobs/${jobId}/interviews`).send({
				...BASE_INTERVIEW,
				interview_dttm: `2026-04-${day}T10:00`,
			});
		}

		const res = await req("get", "/api/interviews?after=2026-01-01T00:00:00");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(10);
	});

	it("returns an empty array when no interviews exist after the cursor", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-01T10:00" });

		const res = await req("get", "/api/interviews?after=2026-12-31T23:59:59");
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("returns 400 for an invalid ?after value", async () => {
		const res = await req("get", "/api/interviews?after=not-a-date");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/after/);
	});

	it("returns 400 when ?limit is 0", async () => {
		const res = await req("get", "/api/interviews?after=2026-04-01T00:00:00&limit=0");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/limit/);
	});

	it("returns 400 when ?limit exceeds 50", async () => {
		const res = await req("get", "/api/interviews?after=2026-04-01T00:00:00&limit=51");
		expect(res.status).toBe(400);
		expect(res.body.error).toMatch(/limit/);
	});

	it("only returns interviews belonging to the authenticated user", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-10T10:00" });

		// Insert an interview for a different user directly
		testDb
			.prepare("INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)")
			.run(2, "Other Corp", "PM", "https://other.example.com", "Not started");
		const otherJobId = (testDb.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
		testDb
			.prepare("INSERT INTO interviews (job_id, interview_stage, interview_dttm) VALUES (?, ?, ?)")
			.run(otherJobId, "phone_screen", "2026-04-15T10:00");

		const res = await req("get", "/api/interviews?after=2026-01-01T00:00:00");
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].job.company).toBe(BASE_JOB.company);
	});

	it("returns enriched interviews with a nested job object", async () => {
		const jobId = await createJob();
		await req("post", `/api/jobs/${jobId}/interviews`).send({ ...BASE_INTERVIEW, interview_dttm: "2026-04-10T10:00" });

		const res = await req("get", "/api/interviews?after=2026-01-01T00:00:00");
		expect(res.status).toBe(200);
		expect(res.body[0].job).toMatchObject({ id: jobId, company: BASE_JOB.company });
	});
});

describe("interview field length validation", () => {
	const LENGTH_CASES = Object.entries(INTERVIEW_MAX_LENGTHS) as [
		keyof typeof INTERVIEW_MAX_LENGTHS,
		number,
	][];

	it.each(LENGTH_CASES)(
		"POST returns 422 when %s exceeds %d characters",
		async (field, max) => {
			const jobId = await createJob();
			const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
				...BASE_INTERVIEW,
				[field]: "a".repeat(max + 1),
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(new RegExp(field));
		},
	);

	it.each(LENGTH_CASES)(
		"POST accepts %s at exactly %d characters",
		async (field, max) => {
			const jobId = await createJob();
			const res = await req("post", `/api/jobs/${jobId}/interviews`).send({
				...BASE_INTERVIEW,
				[field]: "a".repeat(max),
			});
			expect(res.status).toBe(201);
		},
	);

	it.each(LENGTH_CASES)(
		"PUT returns 422 when %s exceeds %d characters",
		async (field, max) => {
			const { jobId, interviewId } = await createJobAndInterview();
			const res = await req(
				"put",
				`/api/jobs/${jobId}/interviews/${interviewId}`,
			).send({
				...BASE_INTERVIEW,
				[field]: "a".repeat(max + 1),
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(new RegExp(field));
		},
	);
});

describe("question field length validation", () => {
	const LENGTH_CASES = Object.entries(QUESTION_MAX_LENGTHS) as [
		keyof typeof QUESTION_MAX_LENGTHS,
		number,
	][];

	it.each(LENGTH_CASES)(
		"POST returns 422 when %s exceeds %d characters",
		async (field, max) => {
			const { jobId, interviewId } = await createJobAndInterview();
			const res = await req(
				"post",
				`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
			).send({
				...BASE_QUESTION,
				[field]: "a".repeat(max + 1),
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(new RegExp(field));
		},
	);

	it.each(LENGTH_CASES)(
		"POST accepts %s at exactly %d characters",
		async (field, max) => {
			const { jobId, interviewId } = await createJobAndInterview();
			const res = await req(
				"post",
				`/api/jobs/${jobId}/interviews/${interviewId}/questions`,
			).send({
				...BASE_QUESTION,
				[field]: "a".repeat(max),
			});
			expect(res.status).toBe(201);
		},
	);

	it.each(LENGTH_CASES)(
		"PUT returns 422 when %s exceeds %d characters",
		async (field, max) => {
			const { jobId, interviewId, questionId } =
				await createJobInterviewAndQuestion();
			const res = await req(
				"put",
				`/api/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
			).send({
				...BASE_QUESTION,
				[field]: "a".repeat(max + 1),
			});
			expect(res.status).toBe(422);
			expect(res.body.error).toMatch(new RegExp(field));
		},
	);
});
