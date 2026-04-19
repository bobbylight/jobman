
import Database from "better-sqlite3";
import { jobBelongsToUser, listInterviews, findInterview, createInterview, updateInterview, deleteInterview, listQuestions, findQuestion, createQuestion, updateQuestion, deleteQuestion, type InterviewCreateData, type QuestionCreateData } from './interviews.js';

const SCHEMA = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL
  );
  CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT NOT NULL,
    status TEXT DEFAULT 'Not started',
    favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE interviews (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id                 INTEGER NOT NULL,
    interview_stage         TEXT NOT NULL,
    interview_dttm         TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_type         TEXT,
    interview_vibe         TEXT,
    interview_notes        TEXT
  );
  CREATE TABLE interview_questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id   INTEGER NOT NULL,
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

const BASE_INTERVIEW: Omit<InterviewCreateData, "job_id"> = {
	interview_dttm: "2025-06-01T10:00:00Z",
	interview_interviewers: "Alice",
	interview_notes: "Went well",
	interview_stage: "Technical",
	interview_type: null,
	interview_vibe: "Good",
};

const BASE_QUESTION: Omit<QuestionCreateData, "interview_id"> = {
	difficulty: 2,
	question_notes: "Classic problem",
	question_text: "Reverse a linked list",
	question_type: "Coding",
};

describe("interviews db", () => {
	let db: Database.Database;
	let jobId: number;
	let otherJobId: number;
	const USER_ID = 1;
	const OTHER_USER_ID = 2;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(USER_ID, "user@example.com");
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(OTHER_USER_ID, "other@example.com");

		const j1 = db
			.prepare("INSERT INTO jobs (user_id, company, role, link) VALUES (?, ?, ?, ?)")
			.run(USER_ID, "Acme", "Engineer", "https://acme.example.com");
		jobId = Number(j1.lastInsertRowid);

		const j2 = db
			.prepare("INSERT INTO jobs (user_id, company, role, link) VALUES (?, ?, ?, ?)")
			.run(OTHER_USER_ID, "OtherCo", "Manager", "https://other.example.com");
		otherJobId = Number(j2.lastInsertRowid);
	});

	describe(jobBelongsToUser, () => {
		it("returns true when the job belongs to the user", () => {
			expect(jobBelongsToUser(db, jobId, USER_ID)).toBeTruthy();
		});

		it("returns false for another user's job", () => {
			expect(jobBelongsToUser(db, otherJobId, USER_ID)).toBeFalsy();
		});

		it("returns false for a non-existent job", () => {
			expect(jobBelongsToUser(db, 999, USER_ID)).toBeFalsy();
		});
	});

	describe(listInterviews, () => {
		it("returns empty array when no interviews exist", () => {
			expect(listInterviews(db, jobId)).toEqual([]);
		});

		it("returns all interviews for the given job", () => {
			createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			createInterview(db, { ...BASE_INTERVIEW, interview_stage: "HR", job_id: jobId });
			expect(listInterviews(db, jobId)).toHaveLength(2);
		});

		it("does not return interviews from a different job", () => {
			createInterview(db, { ...BASE_INTERVIEW, job_id: otherJobId });
			expect(listInterviews(db, jobId)).toHaveLength(0);
		});
	});

	describe(findInterview, () => {
		it("returns undefined for non-existent interview", () => {
			expect(findInterview(db, 999, jobId)).toBeUndefined();
		});

		it("returns the interview when found", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			const found = findInterview(db, created.id, jobId);
			expect(found?.id).toBe(created.id);
			expect(found?.interview_stage).toBe("Technical");
		});

		it("returns undefined when job_id does not match", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			expect(findInterview(db, created.id, otherJobId)).toBeUndefined();
		});
	});

	describe(createInterview, () => {
		it("inserts and returns the new interview", () => {
			const interview = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			expect(interview.id).toBeGreaterThan(0);
			expect(interview.job_id).toBe(jobId);
			expect(interview.interview_stage).toBe("Technical");
			expect(interview.interview_dttm).toBe("2025-06-01T10:00:00Z");
		});

		it("stores nullable fields as null", () => {
			const interview = createInterview(db, {
				...BASE_INTERVIEW,
				interview_interviewers: null,
				interview_notes: null,
				interview_vibe: null,
				job_id: jobId,
			});
			expect(interview.interview_interviewers).toBeNull();
			expect(interview.interview_vibe).toBeNull();
			expect(interview.interview_notes).toBeNull();
		});
	});

	describe(updateInterview, () => {
		it("updates the interview and returns it", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			const updated = updateInterview(db, created.id, jobId, {
				...BASE_INTERVIEW,
				interview_stage: "Behavioral",
			});
			expect(updated?.interview_stage).toBe("Behavioral");
		});

		it("returns null when no matching interview", () => {
			const result = updateInterview(db, 999, jobId, BASE_INTERVIEW);
			expect(result).toBeNull();
		});

		it("returns null when job_id does not match", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			const result = updateInterview(db, created.id, otherJobId, BASE_INTERVIEW);
			expect(result).toBeNull();
		});
	});

	describe(deleteInterview, () => {
		it("deletes an existing interview and returns true", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			expect(deleteInterview(db, created.id, jobId)).toBeTruthy();
			expect(findInterview(db, created.id, jobId)).toBeUndefined();
		});

		it("returns false for non-existent interview", () => {
			expect(deleteInterview(db, 999, jobId)).toBeFalsy();
		});

		it("returns false when job_id does not match", () => {
			const created = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId });
			expect(deleteInterview(db, created.id, otherJobId)).toBeFalsy();
		});
	});

	describe(listQuestions, () => {
		let interviewId: number;

		beforeEach(() => {
			interviewId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
		});

		it("returns empty array when no questions exist", () => {
			expect(listQuestions(db, interviewId)).toEqual([]);
		});

		it("returns all questions for the interview", () => {
			createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId, question_text: "Sort an array" });
			expect(listQuestions(db, interviewId)).toHaveLength(2);
		});

		it("does not return questions from a different interview", () => {
			const otherId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
			createQuestion(db, { ...BASE_QUESTION, interview_id: otherId });
			expect(listQuestions(db, interviewId)).toHaveLength(0);
		});
	});

	describe(findQuestion, () => {
		let interviewId: number;

		beforeEach(() => {
			interviewId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
		});

		it("returns undefined for non-existent question", () => {
			expect(findQuestion(db, 999, interviewId)).toBeUndefined();
		});

		it("returns the question when found", () => {
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			const found = findQuestion(db, created.id, interviewId);
			expect(found?.id).toBe(created.id);
			expect(found?.question_text).toBe("Reverse a linked list");
		});

		it("returns undefined when interview_id does not match", () => {
			const otherId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			expect(findQuestion(db, created.id, otherId)).toBeUndefined();
		});
	});

	describe(createQuestion, () => {
		let interviewId: number;

		beforeEach(() => {
			interviewId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
		});

		it("inserts and returns the new question", () => {
			const q = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			expect(q.id).toBeGreaterThan(0);
			expect(q.interview_id).toBe(interviewId);
			expect(q.question_type).toBe("Coding");
			expect(q.difficulty).toBe(2);
		});

		it("stores null notes as null", () => {
			const q = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId, question_notes: null });
			expect(q.question_notes).toBeNull();
		});
	});

	describe(updateQuestion, () => {
		let interviewId: number;

		beforeEach(() => {
			interviewId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
		});

		it("updates the question and returns it", () => {
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			const updated = updateQuestion(db, created.id, interviewId, {
				...BASE_QUESTION,
				difficulty: 3,
				question_text: "Implement a queue",
			});
			expect(updated?.question_text).toBe("Implement a queue");
			expect(updated?.difficulty).toBe(3);
		});

		it("returns null for non-existent question", () => {
			expect(updateQuestion(db, 999, interviewId, BASE_QUESTION)).toBeNull();
		});

		it("returns null when interview_id does not match", () => {
			const otherId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			expect(updateQuestion(db, created.id, otherId, BASE_QUESTION)).toBeNull();
		});
	});

	describe(deleteQuestion, () => {
		let interviewId: number;

		beforeEach(() => {
			interviewId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
		});

		it("deletes an existing question and returns true", () => {
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			expect(deleteQuestion(db, created.id, interviewId)).toBeTruthy();
			expect(findQuestion(db, created.id, interviewId)).toBeUndefined();
		});

		it("returns false for non-existent question", () => {
			expect(deleteQuestion(db, 999, interviewId)).toBeFalsy();
		});

		it("returns false when interview_id does not match", () => {
			const otherId = createInterview(db, { ...BASE_INTERVIEW, job_id: jobId }).id;
			const created = createQuestion(db, { ...BASE_QUESTION, interview_id: interviewId });
			expect(deleteQuestion(db, created.id, otherId)).toBeFalsy();
		});
	});
});
