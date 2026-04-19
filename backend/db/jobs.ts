import type Database from "better-sqlite3";

interface JobDbRow {
	id: number;
	user_id: number | null;
	date_applied: string | null;
	company: string;
	role: string;
	link: string;
	salary: string | null;
	fit_score: string | null;
	referred_by: string | null;
	status: string;
	recruiter: string | null;
	notes: string | null;
	job_description: string | null;
	ending_substatus: string | null;
	date_phone_screen: string | null;
	date_last_onsite: string | null;
	favorite: number;
	created_at: string;
	updated_at: string;
	tags_csv: string | null;
}

// SQLite stores booleans as 0/1 — convert for the client
export type Job = Omit<JobDbRow, "favorite" | "tags_csv" | "notes" | "job_description"> & {
	favorite: boolean;
	tags: string[];
	/** Absent in summary view; present in full view. */
	notes?: string | null;
	/** Absent in summary view; present in full view. */
	job_description?: string | null;
};

export type JobView = "full" | "summary";

function toClient(row: unknown): Job {
	const r = row as JobDbRow;
	const { tags_csv, ...rest } = r;
	return { ...rest, favorite: Boolean(r.favorite), tags: tags_csv ? tags_csv.split(",") : [] };
}

export interface JobCreateData {
	user_id: number;
	date_applied: string | null;
	company: string;
	role: string;
	link: string;
	salary: string | null;
	fit_score: string | null;
	referred_by: string | null;
	status: string;
	recruiter: string | null;
	notes: string | null;
	job_description: string | null;
	ending_substatus: string | null;
	date_phone_screen: string | null;
	date_last_onsite: string | null;
	favorite: boolean;
	tags: string[];
}

/**
 * Notes and job_description are optional here — if absent the existing DB
 * values are preserved (useful for status/favorite-only updates where the
 * caller doesn't have those fields loaded).
 */
export type JobUpdateData = Omit<JobCreateData, "user_id" | "notes" | "job_description"> & {
	notes?: string | null;
	job_description?: string | null;
};

const JOBS_WITH_TAGS_SQL = `
  SELECT j.*, GROUP_CONCAT(jt.tag) AS tags_csv
  FROM jobs j
  LEFT JOIN job_tags jt ON j.id = jt.job_id
`;

function setTags(db: Database.Database, jobId: number | bigint, tags: string[]): void {
	db.prepare("DELETE FROM job_tags WHERE job_id = ?").run(jobId);
	const insert = db.prepare("INSERT INTO job_tags (job_id, tag) VALUES (?, ?)");
	for (const tag of tags) {
		insert.run(jobId, tag);
	}
}

export function listJobs(db: Database.Database, userId: number, view: JobView = "summary"): Job[] {
	const rows = db
		.prepare(`${JOBS_WITH_TAGS_SQL} WHERE j.user_id = ? GROUP BY j.id ORDER BY j.created_at DESC`)
		.all(userId)
		.map(toClient);
	if (view === "summary") {
		return rows.map(({ notes: _n, job_description: _jd, ...rest }) => rest);
	}
	return rows;
}

export function findJob(
	db: Database.Database,
	jobId: number,
	userId: number,
): Job | undefined {
	const row = db
		.prepare(`${JOBS_WITH_TAGS_SQL} WHERE j.id = ? AND j.user_id = ? GROUP BY j.id`)
		.get(jobId, userId);
	return row ? toClient(row) : undefined;
}

export function jobExists(
	db: Database.Database,
	company: string,
	link: string,
	userId: number,
): boolean {
	return Boolean(db
		.prepare(
			"SELECT id FROM jobs WHERE company = ? AND link = ? AND user_id = ? LIMIT 1",
		)
		.get(company, link, userId));
}

export function createJob(
	db: Database.Database,
	data: JobCreateData,
): Job {
	return db.transaction(() => {
		const result = db
			.prepare(
				`INSERT INTO jobs (user_id, date_applied, company, role, link, salary, fit_score,
          referred_by, status, recruiter, notes, job_description, ending_substatus,
          date_phone_screen, date_last_onsite, favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				data.user_id,
				data.date_applied,
				data.company,
				data.role,
				data.link,
				data.salary,
				data.fit_score,
				data.referred_by,
				data.status,
				data.recruiter,
				data.notes,
				data.job_description,
				data.ending_substatus,
				data.date_phone_screen,
				data.date_last_onsite,
				data.favorite ? 1 : 0,
			);
		db.prepare(
			"INSERT INTO job_status_history (job_id, status) VALUES (?, ?)",
		).run(result.lastInsertRowid, data.status);
		setTags(db, result.lastInsertRowid, data.tags);
		return toClient(
			db
				.prepare(`${JOBS_WITH_TAGS_SQL} WHERE j.id = ? GROUP BY j.id`)
				.get(result.lastInsertRowid),
		);
	})();
}

export function updateJob(
	db: Database.Database,
	jobId: number,
	userId: number,
	data: JobUpdateData,
): Job | null {
	return db.transaction(() => {
		const current = db
			.prepare("SELECT status FROM jobs WHERE id = ? AND user_id = ?")
			.get(jobId, userId) as { status: string } | undefined;
		if (!current) {return null;}

		// Notes/job_description are optional — only update them when explicitly
		// Provided; otherwise keep the existing DB value.
		const notesProvided = "notes" in data;
		const jdProvided = "job_description" in data;

		const info = db
			.prepare(
				`UPDATE jobs SET
          date_applied = ?, company = ?, role = ?, link = ?, salary = ?,
          fit_score = ?, referred_by = ?, status = ?, recruiter = ?,
          notes = CASE WHEN ? THEN ? ELSE notes END,
          job_description = CASE WHEN ? THEN ? ELSE job_description END,
          ending_substatus = ?, date_phone_screen = ?,
          date_last_onsite = ?, favorite = ?
        WHERE id = ? AND user_id = ?`,
			)
			.run(
				data.date_applied,
				data.company,
				data.role,
				data.link,
				data.salary,
				data.fit_score,
				data.referred_by,
				data.status,
				data.recruiter,
				notesProvided ? 1 : 0, data.notes ?? null,
				jdProvided ? 1 : 0, data.job_description ?? null,
				data.ending_substatus,
				data.date_phone_screen,
				data.date_last_onsite,
				data.favorite ? 1 : 0,
				jobId,
				userId,
			);
		if (info.changes === 0) {return null;}

		if (current.status !== data.status) {
			db.prepare(
				"INSERT INTO job_status_history (job_id, status) VALUES (?, ?)",
			).run(jobId, data.status);
		}

		setTags(db, jobId, data.tags);

		// Fresh SELECT picks up the updated_at trigger value
		return toClient(
			db.prepare(`${JOBS_WITH_TAGS_SQL} WHERE j.id = ? GROUP BY j.id`).get(jobId),
		);
	})();
}

export function deleteJob(
	db: Database.Database,
	jobId: number,
	userId: number,
): boolean {
	return db
		.prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?")
		.run(jobId, userId).changes > 0;
}
