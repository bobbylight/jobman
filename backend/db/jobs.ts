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
}

// SQLite stores booleans as 0/1 — convert for the client
export type Job = Omit<JobDbRow, "favorite"> & { favorite: boolean };

function toClient(row: unknown): Job {
	const r = row as JobDbRow;
	return { ...r, favorite: !!r.favorite };
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
}

export type JobUpdateData = Omit<JobCreateData, "user_id">;

export function listJobs(db: Database.Database, userId: number): Job[] {
	return db
		.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC")
		.all(userId)
		.map(toClient);
}

export function findJob(
	db: Database.Database,
	jobId: number,
	userId: number,
): Job | undefined {
	const row = db
		.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
		.get(jobId, userId);
	return row ? toClient(row) : undefined;
}

export function jobExists(
	db: Database.Database,
	company: string,
	link: string,
	userId: number,
): boolean {
	return !!db
		.prepare(
			"SELECT id FROM jobs WHERE company = ? AND link = ? AND user_id = ? LIMIT 1",
		)
		.get(company, link, userId);
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
		return toClient(
			db
				.prepare("SELECT * FROM jobs WHERE id = ?")
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
		if (!current) return null;

		const info = db
			.prepare(
				`UPDATE jobs SET
          date_applied = ?, company = ?, role = ?, link = ?, salary = ?,
          fit_score = ?, referred_by = ?, status = ?, recruiter = ?, notes = ?,
          job_description = ?, ending_substatus = ?, date_phone_screen = ?,
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
				data.notes,
				data.job_description,
				data.ending_substatus,
				data.date_phone_screen,
				data.date_last_onsite,
				data.favorite ? 1 : 0,
				jobId,
				userId,
			);
		if (info.changes === 0) return null;

		if (current.status !== data.status) {
			db.prepare(
				"INSERT INTO job_status_history (job_id, status) VALUES (?, ?)",
			).run(jobId, data.status);
		}

		// Fresh SELECT picks up the updated_at trigger value
		return toClient(db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId));
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
