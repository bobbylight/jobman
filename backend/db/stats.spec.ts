
import Database from "better-sqlite3";
import { getStats } from "./stats.js";

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
  CREATE TABLE job_status_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`;

function makeDb() {
	const db = new Database(":memory:");
	db.exec(SCHEMA);
	return db;
}

// Returns an ISO date string N days in the past
function daysAgo(n: number): string {
	return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

interface JobRow {
	user_id: number;
	company?: string;
	role?: string;
	link?: string;
	status?: string;
	ending_substatus?: string | null;
	date_phone_screen?: string | null;
	date_applied?: string | null;
	referred_by?: string | null;
	recruiter?: string | null;
}

function insertJob(db: Database.Database, row: JobRow): void {
	db.prepare(
		`INSERT INTO jobs
      (user_id, company, role, link, status, ending_substatus, date_phone_screen, date_applied, referred_by, recruiter)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		row.user_id,
		row.company ?? "Acme",
		row.role ?? "Engineer",
		row.link ?? "https://example.com",
		row.status ?? "Not started",
		row.ending_substatus ?? null,
		row.date_phone_screen ?? null,
		row.date_applied ?? null,
		row.referred_by ?? null,
		row.recruiter ?? null,
	);
}

describe(getStats, () => {
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

	describe("totalApplications", () => {
		it("returns 0 when the user has no jobs", () => {
			const stats = getStats(db, USER_ID, "all");
			expect(stats.totalApplications).toBe(0);
		});

		it("counts all non-withdrawn jobs", () => {
			insertJob(db, { status: "Not started", user_id: USER_ID });
			insertJob(db, { status: "Interviewing", user_id: USER_ID });
			insertJob(db, {
				ending_substatus: "Rejected",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(3);
		});

		it("excludes jobs where ending_substatus is 'Withdrawn'", () => {
			insertJob(db, {
				ending_substatus: "Withdrawn",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			insertJob(db, { status: "Interviewing", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(1);
		});

		it("includes Rejected/Withdrawn jobs with null ending_substatus", () => {
			insertJob(db, {
				ending_substatus: null,
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(1);
		});

		it("does not count other users' jobs", () => {
			insertJob(db, { status: "Interviewing", user_id: OTHER_USER_ID });
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(0);
		});
	});

	describe("activePipeline", () => {
		it("counts jobs in all four non-terminal statuses", () => {
			for (const status of [
				"Not started",
				"Applied",
				"Phone screen",
				"Interviewing",
			]) {
				insertJob(db, { status, user_id: USER_ID });
			}
			expect(getStats(db, USER_ID, "all").activePipeline).toBe(4);
		});

		it("excludes terminal statuses from active pipeline", () => {
			insertJob(db, {
				ending_substatus: "Offer accepted",
				status: "Offer!",
				user_id: USER_ID,
			});
			insertJob(db, {
				ending_substatus: "Rejected",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").activePipeline).toBe(0);
		});
	});

	describe("offersReceived", () => {
		it("returns 0 when there are no offers", () => {
			insertJob(db, { status: "Interviewing", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").offersReceived).toBe(0);
		});

		it("counts jobs with Offer! status", () => {
			insertJob(db, {
				ending_substatus: "Offer accepted",
				status: "Offer!",
				user_id: USER_ID,
			});
			insertJob(db, {
				ending_substatus: "Offer declined",
				status: "Offer!",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").offersReceived).toBe(2);
		});
	});

	describe("responseRate", () => {
		it("returns null when there are no submitted applications", () => {
			insertJob(db, { status: "Not started", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").responseRate).toBeNull();
		});

		it("computes the rate as responded / submitted", () => {
			// Denominator (submitted): Applied, Phone screen
			// Numerator (responded): Phone screen
			insertJob(db, { status: "Applied", user_id: USER_ID });
			insertJob(db, { status: "Phone screen", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0.5);
		});

		it("counts Rejected/Withdrawn with a date_phone_screen in the numerator", () => {
			insertJob(db, { status: "Applied", user_id: USER_ID });
			insertJob(db, {
				date_phone_screen: "2025-01-15T10:00",
				ending_substatus: "Rejected",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0.5);
		});

		it("does not count Rejected/Withdrawn without date_phone_screen in the numerator", () => {
			insertJob(db, { status: "Applied", user_id: USER_ID });
			insertJob(db, {
				date_phone_screen: null,
				ending_substatus: "Rejected",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0);
		});
	});

	describe("byStatus", () => {
		it("returns an empty array when there are no jobs", () => {
			expect(getStats(db, USER_ID, "all").byStatus).toEqual([]);
		});

		it("returns one entry per occupied status", () => {
			insertJob(db, { status: "Not started", user_id: USER_ID });
			insertJob(db, { status: "Not started", user_id: USER_ID });
			insertJob(db, { status: "Interviewing", user_id: USER_ID });
			const {byStatus} = getStats(db, USER_ID, "all");
			expect(byStatus).toHaveLength(2);

			const notStarted = byStatus.find((s) => s.status === "Not started");
			const interviewing = byStatus.find((s) => s.status === "Interviewing");
			expect(notStarted?.count).toBe(2);
			expect(interviewing?.count).toBe(1);
		});

		it("omits statuses with zero count", () => {
			insertJob(db, { status: "Phone screen", user_id: USER_ID });
			const statuses = getStats(db, USER_ID, "all").byStatus.map((s) => s.status);
			expect(statuses).not.toContain("Not started");
			expect(statuses).toContain("Phone screen");
		});
	});

	describe("applicationsByWeek", () => {
		it("returns an empty array when there are no jobs", () => {
			expect(getStats(db, USER_ID, "all").applicationsByWeek).toEqual([]);
		});

		it("groups jobs by the ISO week of date_applied", () => {
			// Two jobs on the same date → same week bucket
			insertJob(db, {
				date_applied: "2025-03-10",
				status: "Not started",
				user_id: USER_ID,
			});
			insertJob(db, {
				date_applied: "2025-03-10",
				status: "Not started",
				user_id: USER_ID,
			});
			const weeks = getStats(db, USER_ID, "all").applicationsByWeek;
			expect(weeks).toHaveLength(1);
			expect(weeks[0]?.count).toBe(2);
		});
	});

	describe("transitions", () => {
		it("returns an empty array when there is no status history", () => {
			insertJob(db, { status: "Not started", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").transitions).toEqual([]);
		});

		it("counts consecutive status transitions from job_status_history", () => {
			insertJob(db, { status: "Phone screen", user_id: USER_ID });
			const jobId = (
				db
					.prepare("SELECT last_insert_rowid() as id")
					.get() as { id: number }
			).id;

			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Not started", "2025-01-01T00:00:00Z");
			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Applied", "2025-01-02T00:00:00Z");
			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Phone screen", "2025-01-05T00:00:00Z");

			const {transitions} = getStats(db, USER_ID, "all");
			expect(transitions).toEqual(
				expect.arrayContaining([
					{ count: 1, from: "Direct", to: "Applied" },
					{ count: 1, from: "Applied", to: "Phone screen" },
				]),
			);
			expect(transitions).toHaveLength(2);
		});

		it("excludes withdrawn jobs from transitions", () => {
			insertJob(db, {
				ending_substatus: "Withdrawn",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			const jobId = (
				db
					.prepare("SELECT last_insert_rowid() as id")
					.get() as { id: number }
			).id;

			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Not started", "2025-01-01T00:00:00Z");
			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Applied", "2025-01-02T00:00:00Z");

			expect(getStats(db, USER_ID, "all").transitions).toEqual([]);
		});

		it("infers the final transition from the last history row to the current status", () => {
			// Job is currently at Rejected/Withdrawn with ending_substatus "Ghosted".
			// The resolved CTE should map the to-status to the substatus.
			insertJob(db, {
				ending_substatus: "Ghosted",
				status: "Rejected/Withdrawn",
				user_id: USER_ID,
			});
			const jobId = (
				db
					.prepare("SELECT last_insert_rowid() as id")
					.get() as { id: number }
			).id;

			db.prepare(
				"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
			).run(jobId, "Applied", "2025-01-02T00:00:00Z");

			const {transitions} = getStats(db, USER_ID, "all");
			expect(transitions).toEqual([
				{ count: 1, from: "Applied", to: "Ghosted" },
			]);
		});
	});

	describe("window filter", () => {
		beforeEach(() => {
			// Recent job (today)
			insertJob(db, {
				date_applied: daysAgo(0),
				status: "Not started",
				user_id: USER_ID,
			});
			// Older job (60 days ago — outside 30d but inside 90d)
			insertJob(db, {
				date_applied: daysAgo(60),
				status: "Not started",
				user_id: USER_ID,
			});
			// Very old job (100 days ago — outside both 30d and 90d)
			insertJob(db, {
				date_applied: daysAgo(100),
				status: "Not started",
				user_id: USER_ID,
			});
		});

		it("returns all jobs for 'all' window", () => {
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(3);
		});

		it("only returns jobs within the last 90 days for '90' window", () => {
			expect(getStats(db, USER_ID, "90").totalApplications).toBe(2);
		});

		it("only returns jobs within the last 30 days for '30' window", () => {
			expect(getStats(db, USER_ID, "30").totalApplications).toBe(1);
		});

		it("falls back to created_at when date_applied is null", () => {
			// Insert a job with no date_applied — created_at defaults to now,
			// Which is within all windows.
			insertJob(db, {
				date_applied: null,
				status: "Not started",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "30").totalApplications).toBe(2);
		});
	});
});
