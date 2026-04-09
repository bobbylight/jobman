import type Database from "better-sqlite3";
import type express from "express";
import expressLib from "express";
import * as InterviewsDb from "../db/interviews.js";
import { validateInterview, validateInterviewQuestion } from "../validators.js";

const PAGE_SIZE = 10;

function toEnrichedResponse(rows: InterviewsDb.EnrichedInterviewRow[]) {
	return rows.map(({ company, role, link, ...interview }) => ({
		...interview,
		job: { id: interview.job_id, company, role, link },
	}));
}

// GET /api/interviews — cross-job interview search
//   Date-range mode:  ?from=<iso>&to=<iso>   (inclusive bounds, both optional)
//   Cursor/page mode: ?after=<iso>&limit=<n>  (exclusive lower bound, limit 1–50)
export function createInterviewSearchRouter(db: Database.Database) {
	const router = expressLib.Router();

	router.get("/", (req, res) => {
		const { from, to, after, limit } = req.query as {
			from?: string;
			to?: string;
			after?: string;
			limit?: string;
		};

		// Cursor pagination path
		if (after !== undefined) {
			if (isNaN(Date.parse(after))) {
				return res.status(400).json({ error: "Invalid 'after' date" });
			}
			const parsedLimit = limit !== undefined ? parseInt(limit, 10) : PAGE_SIZE;
			if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return res.status(400).json({ error: "Invalid 'limit' value" });
			}
			const rows = InterviewsDb.listEnrichedInterviewsAfter(
				db,
				req.session.userId!,
				after,
				parsedLimit,
			);
			return res.json(toEnrichedResponse(rows));
		}

		// Date-range path (existing behavior, unchanged)
		if (from !== undefined && isNaN(Date.parse(from))) {
			return res.status(400).json({ error: "Invalid 'from' date" });
		}
		if (to !== undefined && isNaN(Date.parse(to))) {
			return res.status(400).json({ error: "Invalid 'to' date" });
		}
		const rows = InterviewsDb.listEnrichedInterviews(
			db,
			req.session.userId!,
			from,
			to,
		);
		return res.json(toEnrichedResponse(rows));
	});

	return router;
}

// Verifies the job belongs to the user and the interview belongs to the job.
// Sends 404 and returns null if either check fails.
function resolveInterview(
	db: Database.Database,
	jobId: string,
	interviewId: string,
	userId: number,
	res: express.Response,
): InterviewsDb.InterviewRow | null {
	if (!InterviewsDb.jobBelongsToUser(db, Number(jobId), userId)) {
		res.status(404).json({ error: "Job not found" });
		return null;
	}
	const interview = InterviewsDb.findInterview(
		db,
		Number(interviewId),
		Number(jobId),
	);
	if (!interview) {
		res.status(404).json({ error: "Interview not found" });
		return null;
	}
	return interview;
}

export function createInterviewsRouter(db: Database.Database) {
	const router = expressLib.Router({ mergeParams: true });

	// GET all interviews for a job
	router.get("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		if (!InterviewsDb.jobBelongsToUser(db, Number(jobId), req.session.userId!)) {
			return res.status(404).json({ error: "Job not found" });
		}
		return res.json(InterviewsDb.listInterviews(db, Number(jobId)));
	});

	// POST create interview
	router.post("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		const f = req.body as Record<string, unknown>;

		if (!InterviewsDb.jobBelongsToUser(db, Number(jobId), req.session.userId!)) {
			return res.status(404).json({ error: "Job not found" });
		}
		if (f.job_id != null && String(f.job_id) !== jobId) {
			return res
				.status(422)
				.json({ error: "job_id in body must match :jobId in route" });
		}
		const validationError = validateInterview(f);
		if (validationError) return res.status(422).json({ error: validationError });

		const interview = InterviewsDb.createInterview(db, {
			job_id: Number(jobId),
			interview_type: f.interview_type as string,
			interview_dttm: f.interview_dttm as string,
			interview_interviewers: (f.interview_interviewers as string | null) ?? null,
			interview_vibe: (f.interview_vibe as string | null) ?? null,
			interview_notes: (f.interview_notes as string | null) ?? null,
		});
		return res.status(201).json(interview);
	});

	// PUT update interview
	router.put("/:interviewId", (req, res) => {
		const { jobId, interviewId } = req.params as { jobId: string; interviewId: string };
		const f = req.body as Record<string, unknown>;

		if (!InterviewsDb.jobBelongsToUser(db, Number(jobId), req.session.userId!)) {
			return res.status(404).json({ error: "Job not found" });
		}
		if (f.job_id != null && String(f.job_id) !== jobId) {
			return res
				.status(422)
				.json({ error: "job_id in body must match :jobId in route" });
		}
		const validationError = validateInterview(f);
		if (validationError) return res.status(422).json({ error: validationError });

		const interview = InterviewsDb.updateInterview(
			db,
			Number(interviewId),
			Number(jobId),
			{
				interview_type: f.interview_type as string,
				interview_dttm: f.interview_dttm as string,
				interview_interviewers: (f.interview_interviewers as string | null) ?? null,
				interview_vibe: (f.interview_vibe as string | null) ?? null,
				interview_notes: (f.interview_notes as string | null) ?? null,
			},
		);
		if (!interview) return res.status(404).json({ error: "Interview not found" });
		return res.json(interview);
	});

	// DELETE interview
	router.delete("/:interviewId", (req, res) => {
		const { jobId, interviewId } = req.params as { jobId: string; interviewId: string };
		if (!InterviewsDb.jobBelongsToUser(db, Number(jobId), req.session.userId!)) {
			return res.status(404).json({ error: "Job not found" });
		}
		const deleted = InterviewsDb.deleteInterview(
			db,
			Number(interviewId),
			Number(jobId),
		);
		if (!deleted) return res.status(404).json({ error: "Interview not found" });
		return res.json({ success: true });
	});

	// --- Question routes ---

	router.get("/:interviewId/questions", (req, res) => {
		const { jobId, interviewId } = req.params as { jobId: string; interviewId: string };
		if (!resolveInterview(db, jobId, interviewId, req.session.userId!, res))
			return;
		return res.json(InterviewsDb.listQuestions(db, Number(interviewId)));
	});

	router.get("/:interviewId/questions/:questionId", (req, res) => {
		const { jobId, interviewId, questionId } = req.params as { jobId: string; interviewId: string; questionId: string };
		if (!resolveInterview(db, jobId, interviewId, req.session.userId!, res))
			return;
		const question = InterviewsDb.findQuestion(
			db,
			Number(questionId),
			Number(interviewId),
		);
		if (!question) return res.status(404).json({ error: "Question not found" });
		return res.json(question);
	});

	router.post("/:interviewId/questions", (req, res) => {
		const { jobId, interviewId } = req.params as { jobId: string; interviewId: string };
		if (!resolveInterview(db, jobId, interviewId, req.session.userId!, res))
			return;
		const f = req.body as Record<string, unknown>;
		const validationError = validateInterviewQuestion(f);
		if (validationError) return res.status(422).json({ error: validationError });

		const question = InterviewsDb.createQuestion(db, {
			interview_id: Number(interviewId),
			question_type: f.question_type as string,
			question_text: f.question_text as string,
			question_notes: (f.question_notes as string | null) ?? null,
			difficulty: Number(f.difficulty),
		});
		return res.status(201).json(question);
	});

	router.put("/:interviewId/questions/:questionId", (req, res) => {
		const { jobId, interviewId, questionId } = req.params as { jobId: string; interviewId: string; questionId: string };
		if (!resolveInterview(db, jobId, interviewId, req.session.userId!, res))
			return;
		const f = req.body as Record<string, unknown>;
		const validationError = validateInterviewQuestion(f);
		if (validationError) return res.status(422).json({ error: validationError });

		const question = InterviewsDb.updateQuestion(
			db,
			Number(questionId),
			Number(interviewId),
			{
				question_type: f.question_type as string,
				question_text: f.question_text as string,
				question_notes: (f.question_notes as string | null) ?? null,
				difficulty: Number(f.difficulty),
			},
		);
		if (!question) return res.status(404).json({ error: "Question not found" });
		return res.json(question);
	});

	router.delete("/:interviewId/questions/:questionId", (req, res) => {
		const { jobId, interviewId, questionId } = req.params as { jobId: string; interviewId: string; questionId: string };
		if (!resolveInterview(db, jobId, interviewId, req.session.userId!, res))
			return;
		const deleted = InterviewsDb.deleteQuestion(
			db,
			Number(questionId),
			Number(interviewId),
		);
		if (!deleted) return res.status(404).json({ error: "Question not found" });
		return res.json({ success: true });
	});

	return router;
}
