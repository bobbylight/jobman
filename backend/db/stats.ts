import type Database from "better-sqlite3";

export interface StatsResponse {
	totalApplications: number;
	activePipeline: number;
	offersReceived: number;
	/** Fraction of submitted apps that got a human response. null when no data. */
	responseRate: number | null;
	byStatus: { status: string; count: number }[];
	applicationsByWeek: { week: string; count: number }[];
}

type Window = "all" | "90" | "30";

function dateFilter(window: Window): string {
	if (window === "30")
		return "AND COALESCE(date(date_applied), date(created_at)) >= date('now', '-30 days')";
	if (window === "90")
		return "AND COALESCE(date(date_applied), date(created_at)) >= date('now', '-90 days')";
	return "";
}

const ACTIVE_STATUSES = `('Not started', 'Resume submitted', 'Phone screen', 'Interviewing')`;
const SUBMITTED_STATUSES = `('Resume submitted', 'Phone screen', 'Interviewing', 'Offer!', 'Rejected/Withdrawn')`;
const RESPONDED_STATUSES = `('Phone screen', 'Interviewing', 'Offer!')`;

export function getStats(
	db: Database.Database,
	userId: number,
	window: Window,
): StatsResponse {
	const df = dateFilter(window);
	const baseWhere = `user_id = ? AND NOT (ending_substatus = 'Withdrawn') ${df}`;

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
	// submitted apps (anything past "Not started"). For Rejected/Withdrawn jobs
	// we use date_phone_screen IS NOT NULL as a signal they progressed.
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

	return {
		totalApplications: total,
		activePipeline: active,
		offersReceived: offers,
		responseRate,
		byStatus,
		applicationsByWeek,
	};
}
