
import Database from "better-sqlite3";
import { getJobsForLink, getStats } from "./stats.js";
import { applySchema } from "../db.js";

function makeDb() {
	const db = new Database(":memory:");
	applySchema(db);
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

function insertJob(conn: Database.Database, row: JobRow): void {
	conn.prepare(
		`INSERT INTO jobs
      (user_id, company, role, link, status, ending_substatus, date_phone_screen, date_applied, referred_by, recruiter)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		row.user_id,
		row.company ?? "Acme",
		row.role ?? "Engineer",
		row.link ?? "https://example.com",
		row.status ?? "not_started",
		row.ending_substatus ?? null,
		row.date_phone_screen ?? null,
		row.date_applied ?? null,
		row.referred_by ?? null,
		row.recruiter ?? null,
	);
}

function insertHistory(
	conn: Database.Database,
	jobId: number,
	entries: { status: string; entered_at: string }[],
): void {
	for (const e of entries) {
		conn.prepare(
			"INSERT INTO job_status_history (job_id, status, entered_at) VALUES (?, ?, ?)",
		).run(jobId, e.status, e.entered_at);
	}
}

function lastJobId(conn: Database.Database): number {
	return (conn.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id;
}

describe("getStats", () => {
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
			insertJob(db, { status: "not_started", user_id: USER_ID });
			insertJob(db, { status: "interviewing", user_id: USER_ID });
			insertJob(db, {
				ending_substatus: "Rejected",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(3);
		});

		it("excludes jobs where ending_substatus is 'Withdrawn'", () => {
			insertJob(db, {
				ending_substatus: "Withdrawn",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			insertJob(db, { status: "interviewing", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(1);
		});

		it("includes Rejected/Withdrawn jobs with null ending_substatus", () => {
			insertJob(db, {
				ending_substatus: null,
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(1);
		});

		it("does not count other users' jobs", () => {
			insertJob(db, { status: "interviewing", user_id: OTHER_USER_ID });
			expect(getStats(db, USER_ID, "all").totalApplications).toBe(0);
		});
	});

	describe("activePipeline", () => {
		it("counts jobs in all four non-terminal statuses", () => {
			for (const status of [
				"not_started",
				"applied",
				"phone_screen",
				"interviewing",
			]) {
				insertJob(db, { status, user_id: USER_ID });
			}
			expect(getStats(db, USER_ID, "all").activePipeline).toBe(4);
		});

		it("excludes terminal statuses from active pipeline", () => {
			insertJob(db, {
				ending_substatus: "Offer accepted",
				status: "offer",
				user_id: USER_ID,
			});
			insertJob(db, {
				ending_substatus: "Rejected",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").activePipeline).toBe(0);
		});
	});

	describe("offersReceived", () => {
		it("returns 0 when there are no offers", () => {
			insertJob(db, { status: "interviewing", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").offersReceived).toBe(0);
		});

		it("counts jobs with Offer! status", () => {
			insertJob(db, {
				ending_substatus: "Offer accepted",
				status: "offer",
				user_id: USER_ID,
			});
			insertJob(db, {
				ending_substatus: "Offer declined",
				status: "offer",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").offersReceived).toBe(2);
		});
	});

	describe("responseRate", () => {
		it("returns null when there are no submitted applications", () => {
			insertJob(db, { status: "not_started", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").responseRate).toBeNull();
		});

		it("computes the rate as responded / submitted", () => {
			// Denominator (submitted): Applied, Phone screen
			// Numerator (responded): Phone screen
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertJob(db, { status: "phone_screen", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0.5);
		});

		it("counts Rejected/Withdrawn with a date_phone_screen in the numerator", () => {
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertJob(db, {
				date_phone_screen: "2025-01-15T10:00",
				ending_substatus: "Rejected",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0.5);
		});

		it("does not count Rejected/Withdrawn without date_phone_screen in the numerator", () => {
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertJob(db, {
				date_phone_screen: null,
				ending_substatus: "Rejected",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "all").responseRate).toBe(0);
		});
	});

	describe("byStatus", () => {
		it("returns an empty array when there are no jobs", () => {
			expect(getStats(db, USER_ID, "all").byStatus).toStrictEqual([]);
		});

		it("returns one entry per occupied status", () => {
			insertJob(db, { status: "not_started", user_id: USER_ID });
			insertJob(db, { status: "not_started", user_id: USER_ID });
			insertJob(db, { status: "interviewing", user_id: USER_ID });
			const {byStatus} = getStats(db, USER_ID, "all");
			expect(byStatus).toHaveLength(2);

			const notStarted = byStatus.find((s) => s.status === "not_started");
			const interviewing = byStatus.find((s) => s.status === "interviewing");
			expect(notStarted?.count).toBe(2);
			expect(interviewing?.count).toBe(1);
		});

		it("omits statuses with zero count", () => {
			insertJob(db, { status: "phone_screen", user_id: USER_ID });
			const statuses = getStats(db, USER_ID, "all").byStatus.map((s) => s.status);
			expect(statuses).not.toContain("not_started");
			expect(statuses).toContain("phone_screen");
		});
	});

	describe("applicationsByWeek", () => {
		it("returns an empty array when there are no jobs", () => {
			expect(getStats(db, USER_ID, "all").applicationsByWeek).toStrictEqual([]);
		});

		it("groups jobs by the ISO week of date_applied", () => {
			// Two jobs on the same date → same week bucket
			insertJob(db, {
				date_applied: "2025-03-10",
				status: "not_started",
				user_id: USER_ID,
			});
			insertJob(db, {
				date_applied: "2025-03-10",
				status: "not_started",
				user_id: USER_ID,
			});
			const weeks = getStats(db, USER_ID, "all").applicationsByWeek;
			expect(weeks).toHaveLength(1);
			expect(weeks[0]?.count).toBe(2);
		});
	});

	describe("transitions", () => {
		it("returns an empty array when there is no status history", () => {
			insertJob(db, { status: "not_started", user_id: USER_ID });
			expect(getStats(db, USER_ID, "all").transitions).toStrictEqual([]);
		});

		it("counts distinct jobs per stage boundary, not hops", () => {
			insertJob(db, { status: "phone_screen", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "not_started" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-05T00:00:00Z", status: "phone_screen" },
			]);

			const { transitions } = getStats(db, USER_ID, "all");
			expect(transitions).toStrictEqual(
				expect.arrayContaining([
					{ count: 1, from: "Direct", to: "applied" },
					{ count: 1, from: "applied", to: "phone_screen" },
				]),
			);
			expect(transitions).toHaveLength(2);
		});

		it("excludes withdrawn jobs from transitions", () => {
			insertJob(db, {
				ending_substatus: "Withdrawn",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "not_started" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "applied" },
			]);

			expect(getStats(db, USER_ID, "all").transitions).toStrictEqual([]);
		});

		it("routes terminated jobs directly from their last active stage to their substatus", () => {
			insertJob(db, {
				ending_substatus: "Ghosted",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-02T00:00:00Z", status: "applied" },
			]);

			const { transitions } = getStats(db, USER_ID, "all");
			expect(transitions).toStrictEqual(
				expect.arrayContaining([
					{ count: 1, from: "Direct", to: "applied" },
					{ count: 1, from: "applied", to: "Ghosted" },
				]),
			);
			expect(transitions).toHaveLength(2);
		});

		it("preserves flow conservation: Applied count equals sum of its outgoing links", () => {
			// 3 direct jobs reach Applied; 2 progress to Phone screen, 1 terminates at Applied
			for (let i = 0; i < 2; i++) {
				insertJob(db, { status: "phone_screen", user_id: USER_ID });
				insertHistory(db, lastJobId(db), [
					{ entered_at: `2025-01-0${i + 1}T00:00:00Z`, status: "applied" },
					{ entered_at: `2025-01-0${i + 2}T00:00:00Z`, status: "phone_screen" },
				]);
			}
			insertJob(db, {
				ending_substatus: "Rejected",
				status: "rejected_or_withdrawn",
				user_id: USER_ID,
			});
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-10T00:00:00Z", status: "applied" },
			]);

			const { transitions } = getStats(db, USER_ID, "all");
			const appliedIn = transitions
				.filter((t) => t.to === "applied")
				.reduce((s, t) => s + t.count, 0);
			const appliedOut = transitions
				.filter((t) => t.from === "applied")
				.reduce((s, t) => s + t.count, 0);
			expect(appliedIn).toBe(3);
			expect(appliedOut).toBe(3);
		});

		it("active jobs at a stage produce no outgoing terminal link", () => {
			// Job is still at Applied — no substatus, no Phone screen
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);

			const { transitions } = getStats(db, USER_ID, "all");
			// Only the source → Applied link; no outgoing from Applied
			expect(transitions).toStrictEqual([{ count: 1, from: "Direct", to: "applied" }]);
		});

		it("splits source → Applied counts correctly across Direct/Recruited/Referred", () => {
			// Direct
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			// Recruited
			insertJob(db, { recruiter: "Alice", status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-02T00:00:00Z", status: "applied" },
			]);
			// Referred
			insertJob(db, { referred_by: "Bob", status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-03T00:00:00Z", status: "applied" },
			]);

			const { transitions } = getStats(db, USER_ID, "all");
			expect(transitions).toStrictEqual(
				expect.arrayContaining([
					{ count: 1, from: "Direct", to: "applied" },
					{ count: 1, from: "Recruited", to: "applied" },
					{ count: 1, from: "Referred", to: "applied" },
				]),
			);
			// Sum of sources equals total at Applied
			const total = transitions
				.filter((t) => t.to === "applied")
				.reduce((s, t) => s + t.count, 0);
			expect(total).toBe(3);
		});
	});

	describe("window filter", () => {
		beforeEach(() => {
			// Recent job (today)
			insertJob(db, {
				date_applied: daysAgo(0),
				status: "not_started",
				user_id: USER_ID,
			});
			// Older job (60 days ago — outside 30d but inside 90d)
			insertJob(db, {
				date_applied: daysAgo(60),
				status: "not_started",
				user_id: USER_ID,
			});
			// Very old job (100 days ago — outside both 30d and 90d)
			insertJob(db, {
				date_applied: daysAgo(100),
				status: "not_started",
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
				status: "not_started",
				user_id: USER_ID,
			});
			expect(getStats(db, USER_ID, "30").totalApplications).toBe(2);
		});
	});
});

describe("getJobsForLink", () => {
	let db: Database.Database;
	const USER_ID = 1;
	const OTHER_USER_ID = 2;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(USER_ID, "user@example.com");
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(OTHER_USER_ID, "other@example.com");
	});

	describe("validation", () => {
		it("returns null when 'from' is not a recognised node name", () => {
			expect(getJobsForLink(db, USER_ID, "Hacking", "applied", "all")).toBeNull();
		});

		it("returns null when 'to' is not a recognised node name", () => {
			expect(getJobsForLink(db, USER_ID, "applied", "Hacking", "all")).toBeNull();
		});
	});

	describe("source → Applied links", () => {
		it("returns a Direct job that reached Applied", () => {
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Direct", "applied", "all")).toHaveLength(1);
		});

		it("returns a Recruited job that reached Applied", () => {
			insertJob(db, { recruiter: "Alice", status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Recruited", "applied", "all")).toHaveLength(1);
		});

		it("returns a Referred job that reached Applied", () => {
			insertJob(db, { referred_by: "Bob", status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Referred", "applied", "all")).toHaveLength(1);
		});

		it("does not cross-contaminate source types", () => {
			// Only a Direct job; Recruited → Applied should return nothing
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Recruited", "applied", "all")).toHaveLength(0);
		});
	});

	describe("progression links", () => {
		it("returns jobs for the Applied → Phone screen link", () => {
			insertJob(db, { status: "phone_screen", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
			]);
			expect(getJobsForLink(db, USER_ID, "applied", "phone_screen", "all")).toHaveLength(1);
		});

		it("returns jobs for the Phone screen → Interviewing link", () => {
			insertJob(db, { status: "interviewing", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
				{ entered_at: "2025-01-03T00:00:00Z", status: "interviewing" },
			]);
			expect(getJobsForLink(db, USER_ID, "phone_screen", "interviewing", "all")).toHaveLength(1);
		});

		it("returns jobs for the Interviewing → Offer! link", () => {
			insertJob(db, { status: "offer", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
				{ entered_at: "2025-01-03T00:00:00Z", status: "interviewing" },
				{ entered_at: "2025-01-04T00:00:00Z", status: "offer" },
			]);
			expect(getJobsForLink(db, USER_ID, "interviewing", "offer", "all")).toHaveLength(1);
		});
	});

	describe("terminal links", () => {
		it("returns jobs terminated at Applied with no substatus for Applied → Rejected/Withdrawn", () => {
			insertJob(db, { ending_substatus: null, status: "rejected_or_withdrawn", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "applied", "rejected_or_withdrawn", "all")).toHaveLength(1);
		});

		it("returns jobs terminated at Applied with a substatus for Applied → Ghosted", () => {
			insertJob(db, { ending_substatus: "Ghosted", status: "rejected_or_withdrawn", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "applied", "Ghosted", "all")).toHaveLength(1);
		});

		it("does not include in Applied → Rejected/Withdrawn jobs that progressed to Phone screen", () => {
			insertJob(db, { ending_substatus: null, status: "rejected_or_withdrawn", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
			]);
			expect(getJobsForLink(db, USER_ID, "applied", "rejected_or_withdrawn", "all")).toHaveLength(0);
		});

		it("returns jobs terminated at Offer! with a substatus", () => {
			insertJob(db, { ending_substatus: "Offer accepted", status: "offer", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
				{ entered_at: "2025-01-03T00:00:00Z", status: "interviewing" },
				{ entered_at: "2025-01-04T00:00:00Z", status: "offer" },
			]);
			expect(getJobsForLink(db, USER_ID, "offer", "Offer accepted", "all")).toHaveLength(1);
		});

		it("returns jobs at Offer! with no substatus for Offer! → Rejected/Withdrawn", () => {
			insertJob(db, { ending_substatus: null, status: "rejected_or_withdrawn", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
				{ entered_at: "2025-01-02T00:00:00Z", status: "phone_screen" },
				{ entered_at: "2025-01-03T00:00:00Z", status: "interviewing" },
				{ entered_at: "2025-01-04T00:00:00Z", status: "offer" },
			]);
			expect(getJobsForLink(db, USER_ID, "offer", "rejected_or_withdrawn", "all")).toHaveLength(1);
		});
	});

	describe("return values and filtering", () => {
		it("returns the expected LinkJob fields", () => {
			insertJob(db, {
				company: "Acme",
				date_applied: "2025-05-01",
				link: "https://acme.com",
				role: "Engineer",
				status: "applied",
				user_id: USER_ID,
			});
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-05-01T00:00:00Z", status: "applied" },
			]);
			const jobs = getJobsForLink(db, USER_ID, "Direct", "applied", "all")!;
			expect(jobs[0]).toMatchObject({
				company: "Acme",
				date_applied: "2025-05-01",
				id: expect.any(Number),
				link: "https://acme.com",
				role: "Engineer",
			});
		});

		it("returns an empty array when no jobs match the link", () => {
			insertJob(db, { status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "applied", "phone_screen", "all")).toHaveLength(0);
		});

		it("does not return jobs belonging to other users", () => {
			insertJob(db, { status: "applied", user_id: OTHER_USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: "2025-01-01T00:00:00Z", status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Direct", "applied", "all")).toHaveLength(0);
		});

		it("respects the 30-day window and excludes older jobs", () => {
			insertJob(db, { date_applied: daysAgo(60), status: "applied", user_id: USER_ID });
			insertHistory(db, lastJobId(db), [
				{ entered_at: new Date(Date.now() - 60 * 86_400_000).toISOString(), status: "applied" },
			]);
			expect(getJobsForLink(db, USER_ID, "Direct", "applied", "30")).toHaveLength(0);
		});
	});
});
