import type Database from "better-sqlite3";

interface TargetCompanyRow {
	id: number;
	name: string;
	tier: string;
	application_cooldown_days: number | null;
	phone_screen_cooldown_days: number | null;
	onsite_cooldown_days: number | null;
	max_apps_per_period: number | null;
	apps_period_days: number | null;
	policy_summary: string | null;
	policy_url: string | null;
	policy_confidence: string | null;
	policy_updated_at: string | null;
	user_notes: string | null;
	hidden: number;
}

interface JobRow {
	id: number;
	company_key: string;
	role: string;
	status: string;
	date_applied: string | null;
}

interface RejectedJobRow {
	company_key: string;
	rejection_date: string;
	rejection_stage: string;
}

interface LastInterviewRow {
	company_key: string;
	last_dttm: string;
}

interface LastAppRow {
	company_key: string;
	date_applied: string | null;
}

export interface RadarJobSummary {
	id: number;
	role: string;
	status: string;
	date_applied: string | null;
}

export interface RadarPolicy {
	application_cooldown_days: number | null;
	phone_screen_cooldown_days: number | null;
	onsite_cooldown_days: number | null;
	max_apps_per_period: number | null;
	apps_period_days: number | null;
	summary: string | null;
	url: string | null;
	confidence: "official" | "community" | "estimate" | null;
	updated_at: string | null;
}

export interface RadarEntry {
	id: number;
	name: string;
	tier: "faang" | "faang_adjacent" | "custom";
	eligibility: "active" | "cooling_down" | "clear" | "no_history" | "limit_reached";
	unlock_date: string | null;
	days_until_unlock: number | null;
	last_application_date: string | null;
	last_interview_date: string | null;
	latest_active_status: string | null;
	active_job_id: number | null;
	jobs: RadarJobSummary[];
	policy: RadarPolicy;
	user_notes: string | null;
	hidden: boolean;
}

export interface RadarResponse {
	entries: RadarEntry[];
	generated_at: string;
}

export type RadarPatch = Partial<{
	hidden: number;
	user_notes: string | null;
	application_cooldown_days: number | null;
	phone_screen_cooldown_days: number | null;
	onsite_cooldown_days: number | null;
	max_apps_per_period: number | null;
	apps_period_days: number | null;
	policy_summary: string | null;
	policy_url: string | null;
	policy_confidence: string | null;
	policy_updated_at: string | null;
}>;

const PATCH_ALLOWLIST = new Set([
	"hidden",
	"user_notes",
	"application_cooldown_days",
	"phone_screen_cooldown_days",
	"onsite_cooldown_days",
	"max_apps_per_period",
	"apps_period_days",
	"policy_summary",
	"policy_url",
	"policy_confidence",
	"policy_updated_at",
]);

function addUnlock(
	candidates: Date[],
	dateStr: string | null | undefined,
	days: number | null | undefined,
): void {
	if (!dateStr || !days) {return;}
	const d = new Date(dateStr.slice(0, 10));
	if (isNaN(d.getTime())) {return;}
	d.setDate(d.getDate() + days);
	candidates.push(d);
}

export function getRadar(
	db: Database.Database,
	userId: number,
	includeHidden = false,
): RadarResponse {
	const companies = db
		.prepare(
			`SELECT * FROM target_companies ${includeHidden ? "" : "WHERE hidden = 0"}
       ORDER BY (CASE tier WHEN 'faang' THEN 0 ELSE 1 END), name ASC`,
		)
		.all() as TargetCompanyRow[];

	// All user jobs — exclude Rejected/Withdrawn entries that aren't the
	// Applicant's fault (job closed) or aren't meaningful rejections (not a good fit)
	const allJobs = db
		.prepare(
			`SELECT id, lower(company) as company_key, role, status, date_applied
       FROM jobs WHERE user_id = ?
         AND NOT (status = 'Rejected/Withdrawn'
           AND ending_substatus IN ('Job closed', 'Not a good fit'))
       ORDER BY date_applied DESC, created_at DESC`,
		)
		.all(userId) as JobRow[];

	// Most recent application date per company (including rejected jobs)
	const lastAppRows = db
		.prepare(
			`SELECT lower(company) as company_key, MAX(date_applied) as date_applied
       FROM jobs WHERE user_id = ? AND date_applied IS NOT NULL
       GROUP BY lower(company)`,
		)
		.all(userId) as LastAppRow[];

	// Rejected jobs with the stage they reached — exclude user-initiated exits
	const rejectedJobs = db
		.prepare(
			`SELECT
         lower(j.company) as company_key,
         h_rej.entered_at as rejection_date,
         CASE
           WHEN EXISTS(
             SELECT 1 FROM job_status_history h
             WHERE h.job_id = j.id AND h.status IN ('Interviewing', 'Offer!')
           ) THEN 'onsite'
           WHEN EXISTS(
             SELECT 1 FROM job_status_history h
             WHERE h.job_id = j.id AND h.status = 'Phone screen'
           ) THEN 'phone_screen'
           ELSE 'applied'
         END as rejection_stage
       FROM jobs j
       JOIN job_status_history h_rej ON h_rej.job_id = j.id
         AND h_rej.status = 'Rejected/Withdrawn'
       WHERE j.user_id = ?
         AND (j.ending_substatus IS NULL
           OR j.ending_substatus NOT IN ('Withdrawn', 'Offer declined', 'Offer accepted',
             'Job closed', 'Not a good fit'))
       ORDER BY h_rej.entered_at DESC`,
		)
		.all(userId) as RejectedJobRow[];

	// Most recent interview date per company
	const lastInterviewRows = db
		.prepare(
			`SELECT lower(j.company) as company_key, MAX(i.interview_dttm) as last_dttm
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE j.user_id = ?
       GROUP BY lower(j.company)`,
		)
		.all(userId) as LastInterviewRow[];

	// Build lookup maps
	const jobsByCompany = new Map<string, JobRow[]>();
	for (const job of allJobs) {
		const list = jobsByCompany.get(job.company_key) ?? [];
		list.push(job);
		jobsByCompany.set(job.company_key, list);
	}

	const lastAppByCompany = new Map<string, string>();
	for (const row of lastAppRows) {
		if (row.date_applied) {lastAppByCompany.set(row.company_key, row.date_applied);}
	}

	// Most recent rejection date per company per stage
	const rejByCompany = new Map<
		string,
		{ onsite?: string; phone_screen?: string; applied?: string }
	>();
	for (const rej of rejectedJobs) {
		const map = rejByCompany.get(rej.company_key) ?? {};
		const stage = rej.rejection_stage as "onsite" | "phone_screen" | "applied";
		if (!map[stage] || rej.rejection_date > map[stage]!) {
			map[stage] = rej.rejection_date;
		}
		rejByCompany.set(rej.company_key, map);
	}

	const lastInterviewByCompany = new Map<string, string>();
	for (const row of lastInterviewRows) {
		lastInterviewByCompany.set(row.company_key, row.last_dttm);
	}

	const STATUS_RANK: Record<string, number> = {
		"Interviewing": 4,
		"Phone screen": 3,
		"Applied": 2,
		"Not started": 1,
	};
	const RANK_TO_STATUS: Record<number, string> = {
		4: "Interviewing",
		3: "Phone screen",
		2: "Applied",
		1: "Not started",
	};

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const entries: RadarEntry[] = companies.map((tc) => {
		const key = tc.name.toLowerCase();
		const companyJobs = jobsByCompany.get(key) ?? [];
		const lastApplication = lastAppByCompany.get(key) ?? null;
		const lastInterview = lastInterviewByCompany.get(key) ?? null;
		const rejections = rejByCompany.get(key);
		const hasHistory =
			lastApplication !== null || lastInterview !== null || companyJobs.length > 0;

		const bestRank = companyJobs
			.filter((j) => j.status !== "Offer!" && j.status !== "Rejected/Withdrawn")
			.reduce((best, j) => Math.max(best, STATUS_RANK[j.status] ?? 0), 0);
		const latestActiveStatus = bestRank > 0 ? (RANK_TO_STATUS[bestRank] ?? null) : null;

		const activeJob =
			companyJobs.find((j) => j.status !== "Rejected/Withdrawn") ?? null;

		// Compute the earliest date each cooldown expires
		const unlockCandidates: Date[] = [];
		addUnlock(unlockCandidates, lastApplication, tc.application_cooldown_days);
		addUnlock(unlockCandidates, rejections?.phone_screen, tc.phone_screen_cooldown_days);
		addUnlock(unlockCandidates, rejections?.onsite, tc.onsite_cooldown_days);

		const unlockDate =
			unlockCandidates.length > 0
				? new Date(Math.max(...unlockCandidates.map((d) => d.getTime())))
				: null;

		let eligibility: RadarEntry["eligibility"];
		let finalUnlockDate: Date | null = null;

		if (activeJob) {
			eligibility = "active";
		} else if (unlockDate !== null && unlockDate > today) {
			eligibility = "cooling_down";
			finalUnlockDate = unlockDate;
		} else if (!hasHistory) {
			eligibility = "no_history";
		} else {
			eligibility = "clear";
		}

		// Per-period application limit — overrides all other eligibility states
		if (tc.max_apps_per_period && tc.apps_period_days) {
			const cutoff = new Date(today);
			cutoff.setDate(today.getDate() - tc.apps_period_days);
			const cutoffStr = cutoff.toISOString().slice(0, 10);
			const recentJobs = companyJobs.filter(
				(j) => j.date_applied && j.date_applied >= cutoffStr,
			);
			if (recentJobs.length >= tc.max_apps_per_period) {
				// Oldest app in the window + period = when a slot opens up
				const [ oldest ] = recentJobs
					.map((j) => j.date_applied!)
					.toSorted();
				if (oldest) {
					const slotOpens = new Date(oldest);
					slotOpens.setDate(slotOpens.getDate() + tc.apps_period_days);
					finalUnlockDate = slotOpens > today ? slotOpens : null;
				}
				eligibility = "limit_reached";
			}
		}

		const daysUntilUnlock =
			finalUnlockDate && finalUnlockDate > today
				? Math.ceil((finalUnlockDate.getTime() - today.getTime()) / 86_400_000)
				: null;

		return {
			id: tc.id,
			name: tc.name,
			tier: tc.tier as RadarEntry["tier"],
			eligibility,
			unlock_date:
				finalUnlockDate && finalUnlockDate > today
					? finalUnlockDate.toISOString().slice(0, 10)
					: null,
			days_until_unlock: daysUntilUnlock,
			last_application_date: lastApplication,
			last_interview_date: lastInterview,
			latest_active_status: latestActiveStatus,
			active_job_id: activeJob?.id ?? null,
			jobs: companyJobs.map((j) => ({
				id: j.id,
				role: j.role,
				status: j.status,
				date_applied: j.date_applied,
			})),
			policy: {
				application_cooldown_days: tc.application_cooldown_days,
				phone_screen_cooldown_days: tc.phone_screen_cooldown_days,
				onsite_cooldown_days: tc.onsite_cooldown_days,
				max_apps_per_period: tc.max_apps_per_period,
				apps_period_days: tc.apps_period_days,
				summary: tc.policy_summary,
				url: tc.policy_url,
				confidence: tc.policy_confidence as RadarEntry["policy"]["confidence"],
				updated_at: tc.policy_updated_at,
			},
			user_notes: tc.user_notes,
			hidden: tc.hidden === 1,
		};
	});

	return {
		entries: entries.filter((e) => e.jobs.length > 0),
		generated_at: new Date().toISOString(),
	};
}

export function patchRadarEntry(
	db: Database.Database,
	id: number,
	patch: RadarPatch,
): boolean {
	const entries = Object.entries(patch).filter(([k]) => PATCH_ALLOWLIST.has(k));
	if (entries.length === 0) {return false;}

	const sets = entries.map(([k]) => `${k} = ?`).join(", ");
	const values = entries.map(([, v]) => v);

	const result = db
		.prepare(`UPDATE target_companies SET ${sets} WHERE id = ?`)
		.run([...values, id]);

	return result.changes > 0;
}
