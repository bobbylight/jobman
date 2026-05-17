import type Database from "better-sqlite3";

export interface StatsResponse {
	totalApplications: number;
	companiesApplied: number;
	companiesPhoneScreened: number;
	companiesOnSited: number;
	activePipeline: number;
	offersReceived: number;
	/** Fraction of submitted apps that got a human response. null when no data. */
	responseRate: number | null;
	byStatus: { status: string; count: number }[];
	applicationsByWeek: { week: string; count: number }[];
	avgDaysPerStage: { stage: string; avgDays: number }[];
	/** Consecutive status transitions for the Sankey chart. */
	transitions: { from: string; to: string; count: number }[];
	/** Weekly pipeline snapshots — how many jobs were in each status each week. */
	statusOverTime: { week: string; status: string; count: number }[];
	interviewsByWeek: { week: string; count: number }[];
	/** Top 6 companies by application count with summary stats. */
	topCompanies: {
		company: string;
		applications: number;
		active: number;
		bestStage: string;
	}[];
}

type Window = "all" | "90" | "30";

function dateFilter(window: Window): string {
	if (window === "30")
		{return "AND COALESCE(date(date_applied), date(created_at)) >= date('now', '-30 days')";}
	if (window === "90")
		{return "AND COALESCE(date(date_applied), date(created_at)) >= date('now', '-90 days')";}
	return "";
}

const ACTIVE_STATUSES = `('Not started', 'Applied', 'Phone screen', 'Interviewing')`;
const SUBMITTED_STATUSES = `('Applied', 'Phone screen', 'Interviewing', 'Offer!', 'Rejected/Withdrawn')`;
const RESPONDED_STATUSES = `('Phone screen', 'Interviewing', 'Offer!')`;
const EXCLUDED_SUBSTATUSES = `('Withdrawn', 'Not a good fit', 'Job closed')`;

export function getStats(
	db: Database.Database,
	userId: number,
	window: Window,
): StatsResponse {
	const df = dateFilter(window);
	const baseWhere = `user_id = ? AND (ending_substatus IS NULL OR ending_substatus NOT IN ('Withdrawn', 'Not a good fit', 'Job closed')) ${df}`;

	const total = (
		db
			.prepare(`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere}`)
			.get(userId) as { count: number }
	).count;

	const active = (
		db
			.prepare(
				`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere} AND status IN ${ACTIVE_STATUSES}`,
			)
			.get(userId) as { count: number }
	).count;

	const offers = (
		db
			.prepare(
				`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere} AND status = 'Offer!'`,
			)
			.get(userId) as { count: number }
	).count;

	// Response rate: jobs that got a phone screen or beyond, divided by all
	// Submitted apps (anything past "Not started"). For Rejected/Withdrawn jobs
	// We use date_phone_screen IS NOT NULL as a signal they progressed.
	const denominator = (
		db
			.prepare(
				`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere} AND status IN ${SUBMITTED_STATUSES}`,
			)
			.get(userId) as { count: number }
	).count;

	const numerator = (
		db
			.prepare(
				`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere}
       AND (
         status IN ${RESPONDED_STATUSES}
         OR (status = 'Rejected/Withdrawn' AND date_phone_screen IS NOT NULL)
       )`,
			)
			.get(userId) as { count: number }
	).count;

	const responseRate =
		denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : null;

	const companiesApplied = (
		db
			.prepare(
				`SELECT COUNT(DISTINCT company) as count FROM jobs WHERE ${baseWhere} AND status IN ${SUBMITTED_STATUSES}`,
			)
			.get(userId) as { count: number }
	).count;

	const companiesPhoneScreened = (
		db
			.prepare(
				`SELECT COUNT(DISTINCT company) as count FROM jobs WHERE ${baseWhere}
       AND (
         status IN ('Phone screen', 'Interviewing', 'Offer!')
         OR (status = 'Rejected/Withdrawn' AND date_phone_screen IS NOT NULL)
       )`,
			)
			.get(userId) as { count: number }
	).count;

	const companiesOnSited = (
		db
			.prepare(
				`SELECT COUNT(DISTINCT company) as count FROM jobs WHERE ${baseWhere}
       AND (
         status IN ('Interviewing', 'Offer!')
         OR (status = 'Rejected/Withdrawn' AND date_last_onsite IS NOT NULL)
       )`,
			)
			.get(userId) as { count: number }
	).count;

	const byStatus = db
		.prepare(
			`SELECT status, COUNT(*) as count FROM jobs WHERE ${baseWhere} GROUP BY status`,
		)
		.all(userId) as { status: string; count: number }[];

	const applicationsByWeek = db
		.prepare(
			`SELECT
        strftime('%Y-W%W', COALESCE(date_applied, date(created_at))) as week,
        COUNT(*) as count
       FROM jobs
       WHERE ${baseWhere}
       GROUP BY week
       ORDER BY week ASC`,
		)
		.all(userId) as { week: string; count: number }[];

	const avgDaysPerStage = db
		.prepare(
			`WITH job_filter AS (
        SELECT id, status AS current_status, updated_at FROM jobs
        WHERE user_id = ?
          AND (ending_substatus IS NULL OR ending_substatus NOT IN ${EXCLUDED_SUBSTATUSES})
          ${df}
      ),
      consecutive AS (
        SELECT
          h.job_id,
          h.status,
          h.entered_at,
          COALESCE(
            MIN(h2.entered_at),
            -- No next history row: use updated_at if status has since changed,
            -- or now() if the job is still in this stage.
            CASE WHEN jf.current_status <> h.status
                 THEN jf.updated_at
                 ELSE strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
            END
          ) AS next_entered_at
        FROM job_status_history h
        JOIN job_filter jf ON h.job_id = jf.id
        LEFT JOIN job_status_history h2
          ON h2.job_id = h.job_id AND h2.entered_at > h.entered_at
        GROUP BY h.id
      )
      SELECT
        status AS stage,
        ROUND(AVG(julianday(next_entered_at) - julianday(entered_at)), 1) AS avgDays
      FROM consecutive
      WHERE next_entered_at IS NOT NULL
        AND julianday(next_entered_at) - julianday(entered_at) > 0
      GROUP BY status
      ORDER BY MIN(CASE status
        WHEN 'Not started'       THEN 1
        WHEN 'Applied'  THEN 2
        WHEN 'Phone screen'      THEN 3
        WHEN 'Interviewing'      THEN 4
        WHEN 'Offer!'            THEN 5
        WHEN 'Rejected/Withdrawn' THEN 6
        ELSE 7
      END)`,
		)
		.all(userId) as { stage: string; avgDays: number }[];

	// Each job is counted once per stage it reached (distinct-job counting).
	// This ensures flow conservation: count at stage S = sum of counts at all
	// Outgoing links from S (jobs that progressed + jobs that terminated there).
	const transitions = db
		.prepare(
			`WITH job_filter AS (
        SELECT id, status AS current_status, ending_substatus,
          CASE
            WHEN referred_by IS NOT NULL AND referred_by <> '' THEN 'Referred'
            WHEN recruiter IS NOT NULL AND recruiter <> '' THEN 'Recruited'
            ELSE 'Direct'
          END AS starting_status
        FROM jobs
        WHERE user_id = ?
          AND (ending_substatus IS NULL OR ending_substatus NOT IN ${EXCLUDED_SUBSTATUSES})
          ${df}
      ),
      -- For each job, record which active pipeline stages it ever reached
      job_stages AS (
        SELECT
          jf.id,
          jf.starting_status,
          jf.current_status,
          jf.ending_substatus,
          MAX(CASE WHEN h.status = 'Applied'      THEN 1 ELSE 0 END) AS reached_applied,
          MAX(CASE WHEN h.status = 'Phone screen' THEN 1 ELSE 0 END) AS reached_phone_screen,
          MAX(CASE WHEN h.status = 'Interviewing' THEN 1 ELSE 0 END) AS reached_interviewing,
          MAX(CASE WHEN h.status = 'Offer!'       THEN 1 ELSE 0 END) AS reached_offer
        FROM job_filter jf
        LEFT JOIN job_status_history h ON h.job_id = jf.id
        GROUP BY jf.id, jf.starting_status, jf.current_status, jf.ending_substatus
      )
      -- Source → Applied
      SELECT starting_status AS "from", 'Applied' AS "to", COUNT(*) AS count
      FROM job_stages WHERE reached_applied = 1
      GROUP BY starting_status

      UNION ALL
      -- Applied → Phone screen
      SELECT 'Applied', 'Phone screen', COUNT(*) FROM job_stages
      WHERE reached_phone_screen = 1 HAVING COUNT(*) > 0

      UNION ALL
      -- Phone screen → Interviewing
      SELECT 'Phone screen', 'Interviewing', COUNT(*) FROM job_stages
      WHERE reached_interviewing = 1 HAVING COUNT(*) > 0

      UNION ALL
      -- Interviewing → Offer!
      SELECT 'Interviewing', 'Offer!', COUNT(*) FROM job_stages
      WHERE reached_offer = 1 HAVING COUNT(*) > 0

      UNION ALL
      -- Terminal at Applied (stopped before Phone screen, then rejected/withdrawn)
      SELECT 'Applied', COALESCE(ending_substatus, 'Rejected/Withdrawn'), COUNT(*)
      FROM job_stages
      WHERE reached_applied = 1 AND reached_phone_screen = 0
        AND current_status = 'Rejected/Withdrawn'
      GROUP BY COALESCE(ending_substatus, 'Rejected/Withdrawn')

      UNION ALL
      -- Terminal at Phone screen (stopped before Interviewing, then rejected/withdrawn)
      SELECT 'Phone screen', COALESCE(ending_substatus, 'Rejected/Withdrawn'), COUNT(*)
      FROM job_stages
      WHERE reached_phone_screen = 1 AND reached_interviewing = 0
        AND current_status = 'Rejected/Withdrawn'
      GROUP BY COALESCE(ending_substatus, 'Rejected/Withdrawn')

      UNION ALL
      -- Terminal at Interviewing (stopped before Offer!, then rejected/withdrawn)
      SELECT 'Interviewing', COALESCE(ending_substatus, 'Rejected/Withdrawn'), COUNT(*)
      FROM job_stages
      WHERE reached_interviewing = 1 AND reached_offer = 0
        AND current_status = 'Rejected/Withdrawn'
      GROUP BY COALESCE(ending_substatus, 'Rejected/Withdrawn')

      UNION ALL
      -- Terminal at Offer! (offer concluded or rejected after reaching Offer!)
      SELECT 'Offer!', COALESCE(ending_substatus, 'Rejected/Withdrawn'), COUNT(*)
      FROM job_stages
      WHERE reached_offer = 1
        AND (ending_substatus IS NOT NULL OR current_status = 'Rejected/Withdrawn')
      GROUP BY COALESCE(ending_substatus, 'Rejected/Withdrawn')`,
		)
		.all(userId) as { from: string; to: string; count: number }[];

	let interviewDateFilter = "";
	if (window === "30") {
		interviewDateFilter = "AND date(i.interview_dttm) >= date('now', '-30 days')";
	} else if (window === "90") {
		interviewDateFilter = "AND date(i.interview_dttm) >= date('now', '-90 days')";
	}
	const interviewsByWeek = db
		.prepare(
			`SELECT
        strftime('%Y-W%W', date(i.interview_dttm)) as week,
        COUNT(*) as count
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE j.user_id = ?
         ${interviewDateFilter}
       GROUP BY week
       ORDER BY week ASC`,
		)
		.all(userId) as { week: string; count: number }[];

	const topCompanies = db
		.prepare(
			`SELECT
        company,
        COUNT(*) AS applications,
        SUM(CASE WHEN status IN ('Not started', 'Applied', 'Phone screen', 'Interviewing', 'Offer!')
             THEN 1 ELSE 0 END) AS active,
        CASE MAX(CASE status
          WHEN 'Offer!'             THEN 6
          WHEN 'Interviewing'       THEN 5
          WHEN 'Phone screen'       THEN 4
          WHEN 'Applied'   THEN 3
          WHEN 'Rejected/Withdrawn' THEN 2
          WHEN 'Not started'        THEN 1
          ELSE 0
        END)
          WHEN 6 THEN 'Offer!'
          WHEN 5 THEN 'Interviewing'
          WHEN 4 THEN 'Phone screen'
          WHEN 3 THEN 'Applied'
          WHEN 2 THEN 'Rejected/Withdrawn'
          WHEN 1 THEN 'Not started'
        END AS bestStage
       FROM jobs
       WHERE ${baseWhere}
       GROUP BY company
       ORDER BY applications DESC
       LIMIT 6`,
		)
		.all(userId) as {
		company: string;
		applications: number;
		active: number;
		bestStage: string;
	}[];

	// For "all" the recursive CTE terminates at the earliest history entry;
	// For windowed views it terminates at the window boundary.
	const sotCutoff =
		window === "all"
			? `(SELECT date(MIN(h.entered_at), '-7 days')
           FROM job_status_history h JOIN jobs j ON j.id = h.job_id
           WHERE j.user_id = ?)`
			: `date('now', '-${window} days')`;

	const statusOverTime = db
		.prepare(
			`WITH RECURSIVE date_series(snap) AS (
        SELECT date('now')
        UNION ALL
        SELECT date(snap, '-7 days')
        FROM date_series
        WHERE snap > ${sotCutoff}
      ),
      user_jobs AS (
        SELECT id FROM jobs
        WHERE user_id = ?
          AND (ending_substatus IS NULL OR ending_substatus NOT IN ${EXCLUDED_SUBSTATUSES})
      ),
      job_status_at_snap AS (
        SELECT
          d.snap,
          (
            SELECT h.status
            FROM job_status_history h
            WHERE h.job_id = uj.id
              AND date(h.entered_at) <= d.snap
            ORDER BY h.entered_at DESC
            LIMIT 1
          ) AS status
        FROM date_series d
        JOIN user_jobs uj
      )
      SELECT snap AS week, status, COUNT(*) AS count
      FROM job_status_at_snap
      WHERE status IS NOT NULL
      GROUP BY snap, status
      ORDER BY snap`,
		)
		.all(
			...(window === "all" ? [userId, userId] : [userId]),
		) as { week: string; status: string; count: number }[];

	return {
		activePipeline: active,
		applicationsByWeek,
		avgDaysPerStage,
		byStatus,
		companiesApplied,
		companiesOnSited,
		companiesPhoneScreened,
		interviewsByWeek,
		offersReceived: offers,
		responseRate,
		statusOverTime,
		topCompanies,
		totalApplications: total,
		transitions,
	};
}

export interface LinkJob {
	id: number;
	company: string;
	role: string;
	status: string;
	ending_substatus: string | null;
	date_applied: string | null;
	link: string;
}

const VALID_LINK_NODES = new Set([
	"Direct", "Recruited", "Referred",
	"Applied", "Phone screen", "Interviewing", "Offer!",
	"Rejected/Withdrawn",
	"Ghosted", "Job closed", "No response", "Not a good fit",
	"Offer accepted", "Offer declined", "Rejected", "Withdrawn",
]);

const STAGE_TO_COL: Record<string, string> = {
	Applied: "reached_applied",
	"Phone screen": "reached_phone_screen",
	Interviewing: "reached_interviewing",
	"Offer!": "reached_offer",
};

const STAGE_NEXT: Record<string, string | undefined> = {
	Applied: "Phone screen",
	"Phone screen": "Interviewing",
	Interviewing: "Offer!",
	"Offer!": undefined,
};

const SOURCES = new Set(["Direct", "Recruited", "Referred"]);

function buildLinkCondition(from: string, to: string): [string, string[]] {
	if (SOURCES.has(from) && to === "Applied") {
		return ["js.starting_status = ? AND js.reached_applied = 1", [from]];
	}
	if (from === "Applied" && to === "Phone screen") {
		return ["js.reached_phone_screen = 1", []];
	}
	if (from === "Phone screen" && to === "Interviewing") {
		return ["js.reached_interviewing = 1", []];
	}
	if (from === "Interviewing" && to === "Offer!") {
		return ["js.reached_offer = 1", []];
	}

	// Terminal link — from is an active stage, to is a substatus or the fallback
	const fromCol = STAGE_TO_COL[from];
	if (!fromCol) { return ["1 = 0", []]; }

	const nextStage = STAGE_NEXT[from];
	const notNextCond = nextStage ? `AND js.${STAGE_TO_COL[nextStage]} = 0` : "";

	if (from === "Offer!") {
		if (to === "Rejected/Withdrawn") {
			return [
				"js.reached_offer = 1 AND js.current_status = 'Rejected/Withdrawn' AND js.ending_substatus IS NULL",
				[],
			];
		}
		return [
			"js.reached_offer = 1 AND (js.ending_substatus IS NOT NULL OR js.current_status = 'Rejected/Withdrawn') AND js.ending_substatus = ?",
			[to],
		];
	}

	if (to === "Rejected/Withdrawn") {
		return [
			`js.${fromCol} = 1 ${notNextCond} AND js.current_status = 'Rejected/Withdrawn' AND js.ending_substatus IS NULL`,
			[],
		];
	}

	return [
		`js.${fromCol} = 1 ${notNextCond} AND js.current_status = 'Rejected/Withdrawn' AND js.ending_substatus = ?`,
		[to],
	];
}

export function getJobsForLink(
	db: Database.Database,
	userId: number,
	from: string,
	to: string,
	window: Window,
): LinkJob[] | null {
	if (!VALID_LINK_NODES.has(from) || !VALID_LINK_NODES.has(to)) { return null; }

	const df = dateFilter(window);
	const [condition, condParams] = buildLinkCondition(from, to);

	return db
		.prepare(
			`WITH job_filter AS (
        SELECT id, status AS current_status, ending_substatus,
          CASE
            WHEN referred_by IS NOT NULL AND referred_by <> '' THEN 'Referred'
            WHEN recruiter IS NOT NULL AND recruiter <> '' THEN 'Recruited'
            ELSE 'Direct'
          END AS starting_status
        FROM jobs
        WHERE user_id = ?
          AND (ending_substatus IS NULL OR ending_substatus NOT IN ${EXCLUDED_SUBSTATUSES})
          ${df}
      ),
      job_stages AS (
        SELECT
          jf.id,
          jf.starting_status,
          jf.current_status,
          jf.ending_substatus,
          MAX(CASE WHEN h.status = 'Applied'      THEN 1 ELSE 0 END) AS reached_applied,
          MAX(CASE WHEN h.status = 'Phone screen' THEN 1 ELSE 0 END) AS reached_phone_screen,
          MAX(CASE WHEN h.status = 'Interviewing' THEN 1 ELSE 0 END) AS reached_interviewing,
          MAX(CASE WHEN h.status = 'Offer!'       THEN 1 ELSE 0 END) AS reached_offer
        FROM job_filter jf
        LEFT JOIN job_status_history h ON h.job_id = jf.id
        GROUP BY jf.id, jf.starting_status, jf.current_status, jf.ending_substatus
      )
      SELECT j.id, j.company, j.role, j.status, j.ending_substatus, j.date_applied, j.link
      FROM job_stages js
      JOIN jobs j ON j.id = js.id
      WHERE ${condition}
      ORDER BY j.date_applied DESC, j.created_at DESC`,
		)
		.all(userId, ...condParams) as LinkJob[];
}
