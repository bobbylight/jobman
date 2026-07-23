
import Database from "better-sqlite3";
import { getRadar, patchRadarEntry } from "./radar.js";
import { applySchema } from "../db.js";

const USER_ID = 1;

function makeDb() {
	const db = new Database(":memory:");
	applySchema(db);
	db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(USER_ID, "test@example.com");
	db.prepare("INSERT INTO users (id, email) VALUES (2, 'other@example.com')").run();
	return db;
}

function daysAgo(n: number): string {
	return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

interface CompanyOverrides {
	name?: string;
	tier?: string;
	application_cooldown_days?: number | null;
	phone_screen_cooldown_days?: number | null;
	onsite_cooldown_days?: number | null;
	max_apps_per_period?: number | null;
	apps_period_days?: number | null;
	hidden?: number;
}

function insertCompany(db: Database.Database, overrides: CompanyOverrides = {}) {
	const result = db
		.prepare(
			`INSERT INTO target_companies
         (name, tier, application_cooldown_days, phone_screen_cooldown_days,
          onsite_cooldown_days, max_apps_per_period, apps_period_days, hidden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			overrides.name ?? "Acme",
			overrides.tier ?? "faang_adjacent",
			overrides.application_cooldown_days ?? null,
			overrides.phone_screen_cooldown_days ?? null,
			overrides.onsite_cooldown_days ?? null,
			overrides.max_apps_per_period ?? null,
			overrides.apps_period_days ?? null,
			overrides.hidden ?? 0,
		) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

interface JobOverrides {
	user_id?: number;
	company?: string;
	status?: string;
	ending_substatus?: string | null;
	date_applied?: string | null;
}

function insertJob(db: Database.Database, overrides: JobOverrides = {}) {
	const result = db
		.prepare(
			`INSERT INTO jobs (user_id, company, role, link, status, ending_substatus, date_applied)
       VALUES (?, ?, 'Engineer', 'https://example.com', ?, ?, ?)`,
		)
		.run(
			overrides.user_id ?? USER_ID,
			overrides.company ?? "Acme",
			overrides.status ?? "applied",
			overrides.ending_substatus ?? null,
			overrides.date_applied ?? null,
		) as { lastInsertRowid: number };
	return Number(result.lastInsertRowid);
}

describe("getRadar", () => {
	it("returns empty entries when there are no target companies", () => {
		const db = makeDb();
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
		expect(result.generated_at).toBeTruthy();
	});

	it("returns empty entries when no jobs match any target company", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "OtherCorp" });
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
	});

	it("returns an entry when a job matches a target company (case-insensitive)", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "ACME", status: "applied", date_applied: daysAgo(5) });
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0]!.name).toBe("Acme");
		expect(result.entries[0]!.jobs).toHaveLength(1);
	});

	it("excludes hidden companies by default", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", hidden: 1 });
		insertJob(db, { company: "Acme", status: "applied" });
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
	});

	it("includes hidden companies when includeHidden is true", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", hidden: 1 });
		insertJob(db, { company: "Acme", status: "applied" });
		const result = getRadar(db, USER_ID, true);
		expect(result.entries).toHaveLength(1);
		expect(result.entries[0]!.hidden).toBeTruthy();
	});

	it("returns eligibility=active when the company has a non-terminal job", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "Acme", status: "interviewing", date_applied: daysAgo(10) });
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("active");
	});

	it("does not treat a not_started job as active (still clear to apply)", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "Acme", status: "not_started" });
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("clear");
		expect(result.entries[0]!.active_job_id).toBeNull();
	});

	it("falls back to a non-terminal job when a not_started job also exists", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "Acme", status: "not_started" });
		const activeId = insertJob(db, {
			company: "Acme",
			status: "applied",
			date_applied: daysAgo(5),
		});
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("active");
		expect(result.entries[0]!.active_job_id).toBe(activeId);
	});

	it("returns eligibility=cooling_down within the application cooldown window", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", application_cooldown_days: 30 });
		insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "No response",
			date_applied: daysAgo(10),
		});
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("cooling_down");
		expect(result.entries[0]!.days_until_unlock).toBeGreaterThan(0);
		expect(result.entries[0]!.unlock_date).toBeTruthy();
	});

	it("returns eligibility=clear when the application cooldown has expired", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", application_cooldown_days: 30 });
		insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "No response",
			date_applied: daysAgo(60),
		});
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("clear");
		expect(result.entries[0]!.unlock_date).toBeNull();
	});

	it("returns eligibility=limit_reached when max applications per period is exceeded", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", max_apps_per_period: 2, apps_period_days: 30 });
		insertJob(db, { company: "Acme", status: "applied", date_applied: daysAgo(5) });
		insertJob(db, { company: "Acme", status: "applied", date_applied: daysAgo(10) });
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("limit_reached");
	});

	it("excludes Rejected/Withdrawn jobs with 'Job closed' substatus from the jobs list", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Job closed",
			date_applied: daysAgo(5),
		});
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
	});

	it("excludes Rejected/Withdrawn jobs with 'Not a good fit' substatus from the jobs list", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Not a good fit",
			date_applied: daysAgo(5),
		});
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
	});

	it("only returns jobs for the specified user", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "Acme", user_id: 2 });
		const result = getRadar(db, USER_ID);
		expect(result.entries).toHaveLength(0);
	});

	it("returns eligibility=cooling_down when a phone screen rejection cooldown is active", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", phone_screen_cooldown_days: 180 });
		// Non-null ending_substatus is required: SQLite evaluates NULL IN (...) as NULL,
		// Which fails the WHERE clause and silently excludes the job from allJobs.
		const jobId = insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Ghosted",
		});
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'phone_screen')").run(jobId);
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'rejected_or_withdrawn')").run(jobId);
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("cooling_down");
		expect(result.entries[0]!.days_until_unlock).toBeGreaterThan(0);
	});

	it("returns eligibility=cooling_down when an onsite rejection cooldown is active", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme", onsite_cooldown_days: 365 });
		const jobId = insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Ghosted",
		});
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'interviewing')").run(jobId);
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'rejected_or_withdrawn')").run(jobId);
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("cooling_down");
		expect(result.entries[0]!.days_until_unlock).toBeGreaterThan(0);
	});

	it("uses the latest unlock date when multiple cooldowns apply", () => {
		const db = makeDb();
		insertCompany(db, {
			name: "Acme",
			application_cooldown_days: 30,
			onsite_cooldown_days: 365,
		});
		// Application rejection 10 days ago (unlocks in ~20 days)
		insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Ghosted",
			date_applied: daysAgo(10),
		});
		// Onsite rejection just now (unlocks in ~365 days) — most restrictive
		const onsiteJobId = insertJob(db, {
			company: "Acme",
			status: "rejected_or_withdrawn",
			ending_substatus: "Ghosted",
		});
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'interviewing')").run(onsiteJobId);
		db.prepare("INSERT INTO job_status_history (job_id, status) VALUES (?, 'rejected_or_withdrawn')").run(onsiteJobId);
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.eligibility).toBe("cooling_down");
		expect(result.entries[0]!.days_until_unlock).toBeGreaterThan(100);
	});

	it("populates last_interview_date from the interviews table", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		const jobId = insertJob(db, { company: "Acme", status: "interviewing", date_applied: daysAgo(20) });
		db.prepare("INSERT INTO interviews (job_id, interview_dttm, interview_stage) VALUES (?, '2026-03-15T10:00', 'Technical')").run(jobId);
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.last_interview_date).toBe("2026-03-15T10:00");
	});

	it("populates active_job_id with the most recently applied non-terminal job", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		const jobId = insertJob(db, { company: "Acme", status: "interviewing", date_applied: daysAgo(5) });
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.active_job_id).toBe(jobId);
	});

	it("computes latest_active_status as the highest-ranked status across all active jobs", () => {
		const db = makeDb();
		insertCompany(db, { name: "Acme" });
		insertJob(db, { company: "Acme", status: "applied", date_applied: daysAgo(10) });
		insertJob(db, { company: "Acme", status: "phone_screen", date_applied: daysAgo(5) });
		const result = getRadar(db, USER_ID);
		expect(result.entries[0]!.latest_active_status).toBe("phone_screen");
	});

	it("populates policy fields from the target company row", () => {
		const db = makeDb();
		db.prepare(
			`INSERT INTO target_companies
         (name, tier, application_cooldown_days, policy_summary, policy_url, policy_confidence, hidden)
       VALUES ('Acme', 'faang', 365, 'Apply once a year', 'https://acme.com/policy', 'official', 0)`,
		).run();
		insertJob(db, { company: "Acme", status: "applied" });
		const result = getRadar(db, USER_ID);
		const { policy } = result.entries[0]!;
		expect(policy.application_cooldown_days).toBe(365);
		expect(policy.summary).toBe("Apply once a year");
		expect(policy.url).toBe("https://acme.com/policy");
		expect(policy.confidence).toBe("official");
	});
});

describe("patchRadarEntry", () => {
	it("updates allowed fields and returns true", () => {
		const db = makeDb();
		const id = insertCompany(db, { name: "Acme" });
		const updated = patchRadarEntry(db, id, { hidden: 1 });
		expect(updated).toBeTruthy();
		const row = db
			.prepare("SELECT hidden FROM target_companies WHERE id = ?")
			.get(id) as { hidden: number };
		expect(row.hidden).toBe(1);
	});

	it("updates user_notes and returns true", () => {
		const db = makeDb();
		const id = insertCompany(db, { name: "Acme" });
		const updated = patchRadarEntry(db, id, { user_notes: "My notes" });
		expect(updated).toBeTruthy();
		const row = db
			.prepare("SELECT user_notes FROM target_companies WHERE id = ?")
			.get(id) as { user_notes: string };
		expect(row.user_notes).toBe("My notes");
	});

	it("returns false when the patch object has no valid fields", () => {
		const db = makeDb();
		const id = insertCompany(db, { name: "Acme" });
		const updated = patchRadarEntry(db, id, {});
		expect(updated).toBeFalsy();
	});

	it("returns false when the target company id does not exist", () => {
		const db = makeDb();
		const updated = patchRadarEntry(db, 9999, { hidden: 1 });
		expect(updated).toBeFalsy();
	});

	it("updates multiple fields in a single patch", () => {
		const db = makeDb();
		const id = insertCompany(db, { name: "Acme" });
		const updated = patchRadarEntry(db, id, {
			hidden: 1,
			user_notes: "Top priority",
			application_cooldown_days: 90,
		});
		expect(updated).toBeTruthy();
		const row = db
			.prepare("SELECT hidden, user_notes, application_cooldown_days FROM target_companies WHERE id = ?")
			.get(id) as { hidden: number; user_notes: string; application_cooldown_days: number };
		expect(row.hidden).toBe(1);
		expect(row.user_notes).toBe("Top priority");
		expect(row.application_cooldown_days).toBe(90);
	});
});
