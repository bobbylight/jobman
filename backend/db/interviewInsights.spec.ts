
import Database from "better-sqlite3";
import { getInterviewInsights } from "./interviewInsights.js";

const SCHEMA = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL
  );
  CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company TEXT NOT NULL DEFAULT 'Acme',
    role TEXT NOT NULL DEFAULT 'Engineer',
    link TEXT NOT NULL DEFAULT 'https://example.com',
    status TEXT DEFAULT 'Not started'
  );
  CREATE TABLE interviews (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id              INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interview_stage     TEXT NOT NULL,
    interview_dttm      TEXT NOT NULL,
    interview_type      TEXT,
    interview_vibe      TEXT,
    interview_result    TEXT,
    interview_feeling   TEXT
  );
  CREATE TABLE interview_questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id   INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_type  TEXT NOT NULL,
    question_text  TEXT NOT NULL,
    question_notes TEXT,
    difficulty     INTEGER NOT NULL
  );
`;

function makeDb() {
	const db = new Database(":memory:");
	db.exec(SCHEMA);
	return db;
}

function insertJob(
	db: Database.Database,
	userId: number,
	overrides: { company?: string; daysAgo?: number } = {},
): number {
	const res = db
		.prepare(
			`INSERT INTO jobs (user_id, company, role, link, status)
       VALUES (?, ?, 'Engineer', 'https://example.com', 'Interviewing')`,
		)
		.run(userId, overrides.company ?? "Acme") as { lastInsertRowid: number };
	return Number(res.lastInsertRowid);
}

function insertInterview(
	db: Database.Database,
	jobId: number,
	overrides: {
		stage?: string;
		dttm?: string;
		type?: string | null;
		result?: string | null;
		feeling?: string | null;
		vibe?: string | null;
	} = {},
): number {
	const res = db
		.prepare(
			`INSERT INTO interviews
         (job_id, interview_stage, interview_dttm, interview_type, interview_result, interview_feeling, interview_vibe)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			jobId,
			overrides.stage ?? "phone_screen",
			overrides.dttm ?? "2026-04-01T10:00",
			overrides.type ?? null,
			overrides.result ?? null,
			overrides.feeling ?? null,
			overrides.vibe ?? null,
		) as { lastInsertRowid: number };
	return Number(res.lastInsertRowid);
}

function insertQuestion(
	db: Database.Database,
	interviewId: number,
	overrides: { type?: string; difficulty?: number } = {},
): void {
	db.prepare(
		`INSERT INTO interview_questions (interview_id, question_type, question_text, difficulty)
     VALUES (?, ?, 'Sample question', ?)`,
	).run(
		interviewId,
		overrides.type ?? "behavioral",
		overrides.difficulty ?? 3,
	);
}

describe(getInterviewInsights, () => {
	let db: Database.Database;
	const USER_ID = 1;
	const OTHER_USER_ID = 2;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(
			USER_ID,
			"user@example.com",
		);
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(
			OTHER_USER_ID,
			"other@example.com",
		);
	});

	describe("totalInterviews", () => {
		it("returns 0 when the user has no interviews", () => {
			expect(
				getInterviewInsights(db, USER_ID, "all").totalInterviews,
			).toBe(0);
		});

		it("counts all interviews belonging to the user", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId);
			insertInterview(db, jobId);
			expect(
				getInterviewInsights(db, USER_ID, "all").totalInterviews,
			).toBe(2);
		});

		it("does not count another user's interviews", () => {
			const otherJobId = insertJob(db, OTHER_USER_ID);
			insertInterview(db, otherJobId);
			expect(
				getInterviewInsights(db, USER_ID, "all").totalInterviews,
			).toBe(0);
		});
	});

	describe("passRate", () => {
		it("returns null when no interviews have a recorded result", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId);
			expect(getInterviewInsights(db, USER_ID, "all").passRate).toBeNull();
		});

		it("computes the rate as passed / (passed + failed)", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { result: "passed" });
			insertInterview(db, jobId, { result: "passed" });
			insertInterview(db, jobId, { result: "failed" });
			expect(getInterviewInsights(db, USER_ID, "all").passRate).toBeCloseTo(
				0.67,
				1,
			);
		});

		it("excludes interviews with no recorded result from denominator", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { result: "passed" });
			insertInterview(db, jobId, { result: null });
			expect(getInterviewInsights(db, USER_ID, "all").passRate).toBe(1);
		});
	});

	describe("totalQuestions / avgDifficulty", () => {
		it("returns 0 total questions and null avg when there are none", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId);
			const result = getInterviewInsights(db, USER_ID, "all");
			expect(result.totalQuestions).toBe(0);
			expect(result.avgDifficulty).toBeNull();
		});

		it("counts questions across all of the user's interviews", () => {
			const jobId = insertJob(db, USER_ID);
			const iv1 = insertInterview(db, jobId);
			const iv2 = insertInterview(db, jobId);
			insertQuestion(db, iv1);
			insertQuestion(db, iv2);
			insertQuestion(db, iv2);
			expect(
				getInterviewInsights(db, USER_ID, "all").totalQuestions,
			).toBe(3);
		});

		it("computes average difficulty across all questions", () => {
			const jobId = insertJob(db, USER_ID);
			const ivId = insertInterview(db, jobId);
			insertQuestion(db, ivId, { difficulty: 2 });
			insertQuestion(db, ivId, { difficulty: 4 });
			expect(
				getInterviewInsights(db, USER_ID, "all").avgDifficulty,
			).toBe(3);
		});

		it("does not count another user's questions", () => {
			const otherJobId = insertJob(db, OTHER_USER_ID);
			const otherIvId = insertInterview(db, otherJobId);
			insertQuestion(db, otherIvId);
			expect(
				getInterviewInsights(db, USER_ID, "all").totalQuestions,
			).toBe(0);
		});
	});

	describe("byType", () => {
		it("returns an empty array when no interviews have a type", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { type: null });
			expect(getInterviewInsights(db, USER_ID, "all").byType).toEqual([]);
		});

		it("groups interviews by type and records pass/fail counts", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { type: "behavioral", result: "passed" });
			insertInterview(db, jobId, { type: "behavioral", result: "failed" });
			insertInterview(db, jobId, { type: "coding", result: "passed" });

			const {byType} = getInterviewInsights(db, USER_ID, "all");
			const behavioral = byType.find((r) => r.type === "behavioral");
			const coding = byType.find((r) => r.type === "coding");

			expect(behavioral).toMatchObject({ count: 2, passed: 1, failed: 1 });
			expect(coding).toMatchObject({ count: 1, passed: 1, failed: 0 });
		});
	});

	describe("feelingVsResult", () => {
		it("returns an empty array when no feelings are recorded", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId);
			expect(
				getInterviewInsights(db, USER_ID, "all").feelingVsResult,
			).toEqual([]);
		});

		it("returns rows in canonical feeling order", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { feeling: "flunked", result: "failed" });
			insertInterview(db, jobId, { feeling: "aced", result: "passed" });
			insertInterview(db, jobId, { feeling: "meh", result: null });

			const feelings = getInterviewInsights(
				db,
				USER_ID,
				"all",
			).feelingVsResult.map((r) => r.feeling);
			expect(feelings).toEqual(["aced", "meh", "flunked"]);
		});

		it("counts noResult separately from passed and failed", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { feeling: "meh", result: "passed" });
			insertInterview(db, jobId, { feeling: "meh", result: null });

			const [row] = getInterviewInsights(db, USER_ID, "all").feelingVsResult;
			expect(row).toMatchObject({ feeling: "meh", passed: 1, failed: 0, noResult: 1 });
		});
	});

	describe("difficultyDistribution", () => {
		it("returns an empty array when there are no questions", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId);
			expect(
				getInterviewInsights(db, USER_ID, "all").difficultyDistribution,
			).toEqual([]);
		});

		it("groups questions by difficulty with interview pass/fail counts", () => {
			const jobId = insertJob(db, USER_ID);
			const passedIv = insertInterview(db, jobId, { result: "passed" });
			const failedIv = insertInterview(db, jobId, { result: "failed" });
			insertQuestion(db, passedIv, { difficulty: 3 });
			insertQuestion(db, failedIv, { difficulty: 3 });
			insertQuestion(db, failedIv, { difficulty: 5 });

			const dist = getInterviewInsights(db, USER_ID, "all").difficultyDistribution;
			const d3 = dist.find((r) => r.difficulty === 3);
			const d5 = dist.find((r) => r.difficulty === 5);

			expect(d3).toMatchObject({ count: 2, passed: 1, failed: 1 });
			expect(d5).toMatchObject({ count: 1, passed: 0, failed: 1 });
		});
	});

	describe("window filter", () => {
		it("returns all interviews for window='all'", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { dttm: "2020-01-01T10:00" });
			insertInterview(db, jobId, { dttm: "2026-04-01T10:00" });
			expect(
				getInterviewInsights(db, USER_ID, "all").totalInterviews,
			).toBe(2);
		});

		it("excludes interviews older than 30 days for window='30'", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { dttm: "2020-01-01T10:00" });
			insertInterview(db, jobId, {
				dttm: new Date(Date.now() - 5 * 86_400_000)
					.toISOString()
					.slice(0, 16),
			});
			expect(
				getInterviewInsights(db, USER_ID, "30").totalInterviews,
			).toBe(1);
		});

		it("excludes interviews older than 90 days for window='90'", () => {
			const jobId = insertJob(db, USER_ID);
			insertInterview(db, jobId, { dttm: "2020-01-01T10:00" });
			insertInterview(db, jobId, {
				dttm: new Date(Date.now() - 60 * 86_400_000)
					.toISOString()
					.slice(0, 16),
			});
			expect(
				getInterviewInsights(db, USER_ID, "90").totalInterviews,
			).toBe(1);
		});
	});
});
