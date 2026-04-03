import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
	listJobs,
	findJob,
	jobExists,
	createJob,
	updateJob,
	deleteJob,
	type JobCreateData,
} from "./jobs.js";

const SCHEMA = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL
  );
  CREATE TABLE jobs (
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
    updated_at TEXT DEFAULT (datetime('now')),
    job_description TEXT,
    ending_substatus TEXT,
    date_phone_screen TEXT,
    date_last_onsite TEXT
  );
`;

function makeDb() {
	const db = new Database(":memory:");
	db.exec(SCHEMA);
	return db;
}

const BASE_JOB: Omit<JobCreateData, "user_id"> = {
	company: "Acme Corp",
	role: "Engineer",
	link: "https://acme.example.com/jobs/1",
	status: "Not started",
	favorite: false,
	salary: null,
	fit_score: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	referred_by: null,
	job_description: null,
	ending_substatus: null,
	date_phone_screen: null,
	date_last_onsite: null,
};

describe("jobs db", () => {
	let db: Database.Database;
	const USER_ID = 1;
	const OTHER_USER_ID = 2;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(USER_ID, "user@example.com");
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(OTHER_USER_ID, "other@example.com");
	});

	describe("listJobs", () => {
		it("returns empty array when user has no jobs", () => {
			expect(listJobs(db, USER_ID)).toEqual([]);
		});

		it("returns jobs for the given user", () => {
			createJob(db, { ...BASE_JOB, user_id: USER_ID });
			const jobs = listJobs(db, USER_ID);
			expect(jobs).toHaveLength(1);
			expect(jobs[0]?.company).toBe("Acme Corp");
		});

		it("does not return other users' jobs", () => {
			createJob(db, { ...BASE_JOB, user_id: OTHER_USER_ID });
			expect(listJobs(db, USER_ID)).toHaveLength(0);
		});

		it("converts favorite from 0/1 to boolean", () => {
			createJob(db, { ...BASE_JOB, user_id: USER_ID, favorite: true });
			const jobs = listJobs(db, USER_ID);
			expect(jobs[0]?.favorite).toBe(true);
		});
	});

	describe("findJob", () => {
		it("returns undefined for non-existent job", () => {
			expect(findJob(db, 999, USER_ID)).toBeUndefined();
		});

		it("returns the job when it exists", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: USER_ID });
			const found = findJob(db, created.id, USER_ID);
			expect(found?.id).toBe(created.id);
			expect(found?.company).toBe("Acme Corp");
		});

		it("returns undefined for another user's job", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: OTHER_USER_ID });
			expect(findJob(db, created.id, USER_ID)).toBeUndefined();
		});
	});

	describe("jobExists", () => {
		it("returns false when job does not exist", () => {
			expect(jobExists(db, "Acme Corp", "https://acme.example.com/jobs/1", USER_ID)).toBe(false);
		});

		it("returns true when matching company + link exists for user", () => {
			createJob(db, { ...BASE_JOB, user_id: USER_ID });
			expect(jobExists(db, "Acme Corp", "https://acme.example.com/jobs/1", USER_ID)).toBe(true);
		});

		it("returns false for another user's matching job", () => {
			createJob(db, { ...BASE_JOB, user_id: OTHER_USER_ID });
			expect(jobExists(db, "Acme Corp", "https://acme.example.com/jobs/1", USER_ID)).toBe(false);
		});
	});

	describe("createJob", () => {
		it("inserts a job and returns it", () => {
			const job = createJob(db, { ...BASE_JOB, user_id: USER_ID, role: "Backend Dev" });
			expect(job.id).toBeGreaterThan(0);
			expect(job.role).toBe("Backend Dev");
			expect(job.user_id).toBe(USER_ID);
		});

		it("converts boolean favorite to boolean on return", () => {
			const job = createJob(db, { ...BASE_JOB, user_id: USER_ID, favorite: true });
			expect(job.favorite).toBe(true);
		});

		it("stores nullable fields as null", () => {
			const job = createJob(db, { ...BASE_JOB, user_id: USER_ID });
			expect(job.salary).toBeNull();
			expect(job.recruiter).toBeNull();
			expect(job.notes).toBeNull();
		});
	});

	describe("updateJob", () => {
		it("updates a job and returns it", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: USER_ID });
			const updated = updateJob(db, created.id, USER_ID, {
				...BASE_JOB,
				company: "NewCo",
				favorite: false,
			});
			expect(updated?.company).toBe("NewCo");
		});

		it("returns null when job does not belong to user", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: OTHER_USER_ID });
			const result = updateJob(db, created.id, USER_ID, { ...BASE_JOB, favorite: false });
			expect(result).toBeNull();
		});

		it("returns null for non-existent job id", () => {
			const result = updateJob(db, 999, USER_ID, { ...BASE_JOB, favorite: false });
			expect(result).toBeNull();
		});

		it("converts favorite boolean on update", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: USER_ID, favorite: false });
			const updated = updateJob(db, created.id, USER_ID, { ...BASE_JOB, favorite: true });
			expect(updated?.favorite).toBe(true);
		});
	});

	describe("deleteJob", () => {
		it("deletes an existing job and returns true", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: USER_ID });
			expect(deleteJob(db, created.id, USER_ID)).toBe(true);
			expect(findJob(db, created.id, USER_ID)).toBeUndefined();
		});

		it("returns false for non-existent job", () => {
			expect(deleteJob(db, 999, USER_ID)).toBe(false);
		});

		it("returns false when job belongs to another user", () => {
			const created = createJob(db, { ...BASE_JOB, user_id: OTHER_USER_ID });
			expect(deleteJob(db, created.id, USER_ID)).toBe(false);
		});
	});
});
