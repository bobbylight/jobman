import type Database from "better-sqlite3";

export interface InterviewInsightsResponse {
	totalInterviews: number;
	passRate: number | null;
	totalQuestions: number;
	avgDifficulty: number | null;
	byStage: { stage: string; count: number; passed: number; failed: number }[];
	byType: { type: string; count: number; passed: number; failed: number }[];
	feelingVsResult: {
		feeling: string;
		passed: number;
		failed: number;
		noResult: number;
	}[];
	vibeVsResult: {
		vibe: string;
		count: number;
		passed: number;
		failed: number;
	}[];
	questionsByType: {
		type: string;
		count: number;
		avgDifficulty: number;
		passRate: number | null;
	}[];
	difficultyDistribution: {
		difficulty: number;
		count: number;
		passed: number;
		failed: number;
	}[];
	recentQuestions: {
		id: number;
		question_text: string;
		question_type: string;
		question_notes: string | null;
		difficulty: number;
		interview_result: string | null;
		company: string;
		role: string;
		interview_dttm: string;
	}[];
}

type Window = "all" | "90" | "30";

function interviewDateFilter(window: Window): string {
	if (window === "30")
		{return "AND date(i.interview_dttm) >= date('now', '-30 days')";}
	if (window === "90")
		{return "AND date(i.interview_dttm) >= date('now', '-90 days')";}
	return "";
}

const FEELING_ORDER = ["aced", "pretty_good", "meh", "struggled", "flunked"];

export function getInterviewInsights(
	db: Database.Database,
	userId: number,
	window: Window,
): InterviewInsightsResponse {
	const df = interviewDateFilter(window);
	const baseWhere = `j.user_id = ? ${df}`;

	// ── Summary ──────────────────────────────────────────────────────────────
	const summary = db
		.prepare(
			`SELECT COUNT(*) AS totalInterviews,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}`,
		)
		.get(userId) as { totalInterviews: number; passed: number; failed: number };

	const withResults = summary.passed + summary.failed;
	const passRate =
		withResults > 0
			? Math.round((summary.passed / withResults) * 100) / 100
			: null;

	const questionSummary = db
		.prepare(
			`SELECT COUNT(*) AS totalQuestions,
              ROUND(AVG(q.difficulty), 1) AS avgDifficulty
       FROM interview_questions q
       JOIN interviews i ON i.id = q.interview_id
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}`,
		)
		.get(userId) as { totalQuestions: number; avgDifficulty: number | null };

	// ── By stage ─────────────────────────────────────────────────────────────
	const byStage = db
		.prepare(
			`SELECT i.interview_stage AS stage,
              COUNT(*) AS count,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}
       GROUP BY i.interview_stage`,
		)
		.all(userId) as {
		stage: string;
		count: number;
		passed: number;
		failed: number;
	}[];

	// ── By type ──────────────────────────────────────────────────────────────
	const byType = db
		.prepare(
			`SELECT i.interview_type AS type,
              COUNT(*) AS count,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere} AND i.interview_type IS NOT NULL
       GROUP BY i.interview_type
       ORDER BY count DESC`,
		)
		.all(userId) as {
		type: string;
		count: number;
		passed: number;
		failed: number;
	}[];

	// ── Feeling vs result ─────────────────────────────────────────────────────
	const feelingRaw = db
		.prepare(
			`SELECT i.interview_feeling AS feeling,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN i.interview_result IS NULL THEN 1 ELSE 0 END) AS noResult
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere} AND i.interview_feeling IS NOT NULL
       GROUP BY i.interview_feeling`,
		)
		.all(userId) as {
		feeling: string;
		passed: number;
		failed: number;
		noResult: number;
	}[];

	// Sort by canonical feeling order
	const feelingMap = Object.fromEntries(feelingRaw.map((r) => [r.feeling, r]));
	const feelingVsResult = FEELING_ORDER.flatMap((f) => {
		const row = feelingMap[f];
		return row ? [row] : [];
	});

	// ── Vibe vs result ────────────────────────────────────────────────────────
	const vibeVsResult = db
		.prepare(
			`SELECT i.interview_vibe AS vibe,
              COUNT(*) AS count,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere} AND i.interview_vibe IS NOT NULL
       GROUP BY i.interview_vibe`,
		)
		.all(userId) as {
		vibe: string;
		count: number;
		passed: number;
		failed: number;
	}[];

	// ── Questions by type ─────────────────────────────────────────────────────
	const questionsByTypeRaw = db
		.prepare(
			`SELECT q.question_type AS type,
              COUNT(*) AS count,
              ROUND(AVG(q.difficulty), 1) AS avgDifficulty,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1.0 ELSE 0 END) AS passedCount,
              SUM(CASE WHEN i.interview_result IN ('passed', 'failed') THEN 1 ELSE 0 END) AS withResult
       FROM interview_questions q
       JOIN interviews i ON i.id = q.interview_id
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}
       GROUP BY q.question_type
       ORDER BY count DESC`,
		)
		.all(userId) as {
		type: string;
		count: number;
		avgDifficulty: number;
		passedCount: number;
		withResult: number;
	}[];

	const questionsByType = questionsByTypeRaw.map(
		({ type, count, avgDifficulty, passedCount, withResult }) => ({
			avgDifficulty,
			count,
			passRate:
				withResult > 0
					? Math.round((passedCount / withResult) * 100) / 100
					: null,
			type,
		}),
	);

	// ── Difficulty distribution ───────────────────────────────────────────────
	const difficultyDistribution = db
		.prepare(
			`SELECT q.difficulty,
              COUNT(*) AS count,
              SUM(CASE WHEN i.interview_result = 'passed' THEN 1 ELSE 0 END) AS passed,
              SUM(CASE WHEN i.interview_result = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM interview_questions q
       JOIN interviews i ON i.id = q.interview_id
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}
       GROUP BY q.difficulty
       ORDER BY q.difficulty`,
		)
		.all(userId) as {
		difficulty: number;
		count: number;
		passed: number;
		failed: number;
	}[];

	// ── Recent questions ──────────────────────────────────────────────────────
	const recentQuestions = db
		.prepare(
			`SELECT q.id,
              q.question_text,
              q.question_type,
              q.question_notes,
              q.difficulty,
              i.interview_result,
              j.company,
              j.role,
              i.interview_dttm
       FROM interview_questions q
       JOIN interviews i ON i.id = q.interview_id
       JOIN jobs j ON j.id = i.job_id
       WHERE ${baseWhere}
       ORDER BY i.interview_dttm DESC
       LIMIT 50`,
		)
		.all(userId) as {
		id: number;
		question_text: string;
		question_type: string;
		question_notes: string | null;
		difficulty: number;
		interview_result: string | null;
		company: string;
		role: string;
		interview_dttm: string;
	}[];

	return {
		avgDifficulty: questionSummary.avgDifficulty,
		byStage,
		byType,
		difficultyDistribution,
		feelingVsResult,
		passRate,
		questionsByType,
		recentQuestions,
		totalInterviews: summary.totalInterviews,
		totalQuestions: questionSummary.totalQuestions,
		vibeVsResult,
	};
}
