import type Database from "better-sqlite3";

export interface StatsResponse {
	totalApplications: number;
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
	/** Top 5 companies by application count with summary stats. */
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

export function getStats(
	db: Database.Database,
	userId: number,
	window: Window,
): StatsResponse {
	const df = dateFilter(window);
	const baseWhere = `user_id = ? AND (ending_substatus IS NULL OR ending_substatus <> 'Withdrawn') ${df}`;

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
          AND (ending_substatus IS NULL OR ending_substatus <> 'Withdrawn')
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
          AND (ending_substatus IS NULL OR ending_substatus <> 'Withdrawn')
          ${df}
      ),
      -- Pair each history row with the next history row for the same job
      consecutive AS (
        SELECT
          h.job_id,
          CASE WHEN h.status = 'Not started' THEN jf.starting_status
               ELSE h.status END AS from_status,
          COALESCE(
            (SELECT h2.status FROM job_status_history h2
             WHERE h2.job_id = h.job_id AND h2.entered_at > h.entered_at
             ORDER BY h2.entered_at LIMIT 1),
            -- If there is no next history row and the job's current status
            -- differs from this row, treat the current status as the target.
            CASE WHEN jf.current_status <> h.status
                 THEN jf.current_status END
          ) AS to_status,
          jf.ending_substatus
        FROM job_status_history h
        JOIN job_filter jf ON h.job_id = jf.id
      ),
      -- Replace terminal statuses with their ending_substatus when set,
      -- so the Sankey shows granular outcomes rather than the bucket label.
      resolved AS (
        SELECT
          from_status,
          CASE
            WHEN to_status IN ('Rejected/Withdrawn', 'Offer!') AND ending_substatus IS NOT NULL
            THEN ending_substatus
            ELSE to_status
          END AS to_status
        FROM consecutive
        WHERE to_status IS NOT NULL
      )
      SELECT from_status AS "from", to_status AS "to", COUNT(*) AS count
      FROM resolved
      GROUP BY from_status, to_status`,
		)
		.all(userId) as { from: string; to: string; count: number }[];

	// Synthetic link: jobs currently sitting at "Applied" with no
	// Forward movement yet. These are excluded from the real transitions (their
	// To_status resolves to NULL) so there is no double-counting.
	const pendingAppliedCount = (
		db
			.prepare(
				`SELECT COUNT(*) as count FROM jobs WHERE ${baseWhere} AND status = 'Applied'`,
			)
			.get(userId) as { count: number }
	).count;
	if (pendingAppliedCount > 0) {
		transitions.push({
			count: pendingAppliedCount,
			from: "Applied",
			to: "No response",
		});
	}

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
       LIMIT 5`,
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
          AND (ending_substatus IS NULL OR ending_substatus <> 'Withdrawn')
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
		offersReceived: offers,
		responseRate,
		statusOverTime,
		topCompanies,
		totalApplications: total,
		transitions,
	};
}
