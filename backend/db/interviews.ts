import type Database from "better-sqlite3";

export interface InterviewRow {
	id: number;
	job_id: number;
	interview_stage: string;
	interview_dttm: string;
	interview_interviewers: string | null;
	interview_type: string | null;
	interview_vibe: string | null;
	interview_notes: string | null;
}

export interface InterviewQuestionRow {
	id: number;
	interview_id: number;
	question_type: string;
	question_text: string;
	question_notes: string | null;
	difficulty: number;
}

export interface InterviewCreateData {
	job_id: number;
	interview_stage: string;
	interview_dttm: string;
	interview_interviewers: string | null;
	interview_type: string | null;
	interview_vibe: string | null;
	interview_notes: string | null;
}

export type InterviewUpdateData = Omit<InterviewCreateData, "job_id">;

export interface QuestionCreateData {
	interview_id: number;
	question_type: string;
	question_text: string;
	question_notes: string | null;
	difficulty: number;
}

export type QuestionUpdateData = Omit<QuestionCreateData, "interview_id">;

export interface EnrichedInterviewRow extends InterviewRow {
	company: string;
	role: string;
	link: string;
}

export function listEnrichedInterviews(
	db: Database.Database,
	userId: number,
	from?: string,
	to?: string,
): EnrichedInterviewRow[] {
	const conditions: string[] = ["j.user_id = ?"];
	const params: (number | string)[] = [userId];

	if (from !== undefined) {
		conditions.push("i.interview_dttm >= ?");
		params.push(from);
	}
	if (to !== undefined) {
		conditions.push("i.interview_dttm <= ?");
		params.push(to);
	}

	const sql = `
		SELECT i.id, i.job_id, i.interview_stage, i.interview_dttm,
		       i.interview_interviewers, i.interview_type, i.interview_vibe, i.interview_notes,
		       j.company, j.role, j.link
		FROM interviews i
		JOIN jobs j ON j.id = i.job_id
		WHERE ${conditions.join(" AND ")}
		ORDER BY i.interview_dttm ASC
	`;
	return db.prepare(sql).all(...params) as EnrichedInterviewRow[];
}

export function listEnrichedInterviewsAfter(
	db: Database.Database,
	userId: number,
	after: string,
	limit: number,
): EnrichedInterviewRow[] {
	const sql = `
		SELECT i.id, i.job_id, i.interview_stage, i.interview_dttm,
		       i.interview_interviewers, i.interview_type, i.interview_vibe, i.interview_notes,
		       j.company, j.role, j.link
		FROM interviews i
		JOIN jobs j ON j.id = i.job_id
		WHERE j.user_id = ? AND i.interview_dttm > ?
		ORDER BY i.interview_dttm ASC
		LIMIT ?
	`;
	return db.prepare(sql).all(userId, after, limit) as EnrichedInterviewRow[];
}

export function jobBelongsToUser(
	db: Database.Database,
	jobId: number,
	userId: number,
): boolean {
	return !!db
		.prepare("SELECT id FROM jobs WHERE id = ? AND user_id = ?")
		.get(jobId, userId);
}

export function listInterviews(
	db: Database.Database,
	jobId: number,
): InterviewRow[] {
	return db
		.prepare("SELECT * FROM interviews WHERE job_id = ?")
		.all(jobId) as InterviewRow[];
}

export function findInterview(
	db: Database.Database,
	interviewId: number,
	jobId: number,
): InterviewRow | undefined {
	return db
		.prepare("SELECT * FROM interviews WHERE id = ? AND job_id = ?")
		.get(interviewId, jobId) as InterviewRow | undefined;
}

export function createInterview(
	db: Database.Database,
	data: InterviewCreateData,
): InterviewRow {
	const result = db
		.prepare(
			`INSERT INTO interviews (job_id, interview_stage, interview_dttm,
        interview_interviewers, interview_type, interview_vibe, interview_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			data.job_id,
			data.interview_stage,
			data.interview_dttm,
			data.interview_interviewers,
			data.interview_type,
			data.interview_vibe,
			data.interview_notes,
		);
	return db
		.prepare("SELECT * FROM interviews WHERE id = ?")
		.get(result.lastInsertRowid) as InterviewRow;
}

export function updateInterview(
	db: Database.Database,
	interviewId: number,
	jobId: number,
	data: InterviewUpdateData,
): InterviewRow | null {
	const info = db
		.prepare(
			`UPDATE interviews SET
        interview_stage = ?, interview_dttm = ?, interview_interviewers = ?,
        interview_type = ?, interview_vibe = ?, interview_notes = ?
      WHERE id = ? AND job_id = ?`,
		)
		.run(
			data.interview_stage,
			data.interview_dttm,
			data.interview_interviewers,
			data.interview_type,
			data.interview_vibe,
			data.interview_notes,
			interviewId,
			jobId,
		);
	if (info.changes === 0) return null;
	return db
		.prepare("SELECT * FROM interviews WHERE id = ?")
		.get(interviewId) as InterviewRow;
}

export function deleteInterview(
	db: Database.Database,
	interviewId: number,
	jobId: number,
): boolean {
	return db
		.prepare("DELETE FROM interviews WHERE id = ? AND job_id = ?")
		.run(interviewId, jobId).changes > 0;
}

export function listQuestions(
	db: Database.Database,
	interviewId: number,
): InterviewQuestionRow[] {
	return db
		.prepare("SELECT * FROM interview_questions WHERE interview_id = ?")
		.all(interviewId) as InterviewQuestionRow[];
}

export function findQuestion(
	db: Database.Database,
	questionId: number,
	interviewId: number,
): InterviewQuestionRow | undefined {
	return db
		.prepare(
			"SELECT * FROM interview_questions WHERE id = ? AND interview_id = ?",
		)
		.get(questionId, interviewId) as InterviewQuestionRow | undefined;
}

export function createQuestion(
	db: Database.Database,
	data: QuestionCreateData,
): InterviewQuestionRow {
	const result = db
		.prepare(
			`INSERT INTO interview_questions
        (interview_id, question_type, question_text, question_notes, difficulty)
       VALUES (?, ?, ?, ?, ?)`,
		)
		.run(
			data.interview_id,
			data.question_type,
			data.question_text,
			data.question_notes,
			data.difficulty,
		);
	return db
		.prepare("SELECT * FROM interview_questions WHERE id = ?")
		.get(result.lastInsertRowid) as InterviewQuestionRow;
}

export function updateQuestion(
	db: Database.Database,
	questionId: number,
	interviewId: number,
	data: QuestionUpdateData,
): InterviewQuestionRow | null {
	const info = db
		.prepare(
			`UPDATE interview_questions SET
        question_type = ?, question_text = ?, question_notes = ?, difficulty = ?
      WHERE id = ? AND interview_id = ?`,
		)
		.run(
			data.question_type,
			data.question_text,
			data.question_notes,
			data.difficulty,
			questionId,
			interviewId,
		);
	if (info.changes === 0) return null;
	return db
		.prepare("SELECT * FROM interview_questions WHERE id = ?")
		.get(questionId) as InterviewQuestionRow;
}

export function deleteQuestion(
	db: Database.Database,
	questionId: number,
	interviewId: number,
): boolean {
	return db
		.prepare(
			"DELETE FROM interview_questions WHERE id = ? AND interview_id = ?",
		)
		.run(questionId, interviewId).changes > 0;
}
