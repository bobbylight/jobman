import type Database from "better-sqlite3";
import { TERMINAL_STATUSES } from "../validators.js";

export interface JobSearchRow {
	id: number;
	user_id: number;
	name: string;
	started_at: string;
	closed_at: string | null;
	notes: string | null;
}

export interface BlockingJob {
	id: number;
	company: string;
	role: string;
	status: string;
}

export function listSearches(
	db: Database.Database,
	userId: number,
): JobSearchRow[] {
	return db
		.prepare(
			"SELECT * FROM job_searches WHERE user_id = ? ORDER BY started_at DESC, id DESC",
		)
		.all(userId) as JobSearchRow[];
}

export function getSearch(
	db: Database.Database,
	id: number,
	userId: number,
): JobSearchRow | undefined {
	return db
		.prepare("SELECT * FROM job_searches WHERE id = ? AND user_id = ?")
		.get(id, userId) as JobSearchRow | undefined;
}

export function getActiveSearch(
	db: Database.Database,
	userId: number,
): JobSearchRow | undefined {
	return db
		.prepare(
			"SELECT * FROM job_searches WHERE user_id = ? AND closed_at IS NULL",
		)
		.get(userId) as JobSearchRow | undefined;
}

/** True if the job exists, belongs to the user, and sits in their currently active (not closed) round. */
export function isJobInActiveSearch(
	db: Database.Database,
	jobId: number,
	userId: number,
): boolean {
	return Boolean(
		db
			.prepare(
				`SELECT 1 FROM jobs j
				 JOIN job_searches s ON s.id = j.search_id
				 WHERE j.id = ? AND j.user_id = ? AND s.closed_at IS NULL`,
			)
			.get(jobId, userId),
	);
}

/** Returns the user's active round, opening a first one if they don't have one yet. */
export function getOrCreateActiveSearch(
	db: Database.Database,
	userId: number,
): JobSearchRow {
	const active = getActiveSearch(db, userId);
	if (active) {
		return active;
	}
	return startNewSearch(db, userId, "My Job Search", null);
}

/** Jobs in the given round that aren't in a terminal status — these block closing the round. */
export function listBlockingJobs(
	db: Database.Database,
	searchId: number,
): BlockingJob[] {
	const placeholders = [...TERMINAL_STATUSES].map(() => "?").join(", ");
	return db
		.prepare(
			`SELECT id, company, role, status FROM jobs
       WHERE search_id = ? AND status NOT IN (${placeholders})
       ORDER BY created_at DESC`,
		)
		.all(searchId, ...TERMINAL_STATUSES) as BlockingJob[];
}

/**
 * Closes the user's active round and opens a new one in its place. Callers must
 * verify (via listBlockingJobs) that the active round has no non-terminal jobs first.
 */
export function startNewSearch(
	db: Database.Database,
	userId: number,
	name: string,
	notes: string | null,
): JobSearchRow {
	return db.transaction(() => {
		db.prepare(
			"UPDATE job_searches SET closed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE user_id = ? AND closed_at IS NULL",
		).run(userId);
		const result = db
			.prepare(
				"INSERT INTO job_searches (user_id, name, notes) VALUES (?, ?, ?)",
			)
			.run(userId, name, notes);
		return db
			.prepare("SELECT * FROM job_searches WHERE id = ?")
			.get(result.lastInsertRowid) as JobSearchRow;
	})();
}

export function updateSearch(
	db: Database.Database,
	id: number,
	userId: number,
	data: { name: string; notes: string | null },
): JobSearchRow | null {
	const info = db
		.prepare(
			"UPDATE job_searches SET name = ?, notes = ? WHERE id = ? AND user_id = ?",
		)
		.run(data.name, data.notes, id, userId);
	if (info.changes === 0) {
		return null;
	}
	return db
		.prepare("SELECT * FROM job_searches WHERE id = ?")
		.get(id) as JobSearchRow;
}
