import type Database from "better-sqlite3";
import express from "express";
import * as JobsDb from "../db/jobs.js";
import { validateEndingSubstatus, validateJobFields } from "../validators.js";

export function createJobsRouter(db: Database.Database) {
	const router = express.Router();

	router.get("/", (req, res) => {
		res.json(JobsDb.listJobs(db, req.session.userId!));
	});

	router.get("/:jobId", (req, res) => {
		const job = JobsDb.findJob(db, Number(req.params.jobId), req.session.userId!);
		if (!job) return res.status(404).json({ error: "Job not found" });
		return res.json(job);
	});

	router.post("/", (req, res) => {
		const f = req.body;
		const userId = req.session.userId!;

		const lengthError = validateJobFields(f);
		if (lengthError) return res.status(422).json({ error: lengthError });

		const substatusError = validateEndingSubstatus(
			f.status ?? "Not started",
			f.ending_substatus ?? null,
		);
		if (substatusError) return res.status(422).json({ error: substatusError });

		if (f.company && f.link && JobsDb.jobExists(db, f.company, f.link, userId)) {
			return res.status(409).json({ error: "Job already exists" });
		}

		const job = JobsDb.createJob(db, {
			user_id: userId,
			date_applied: f.date_applied ?? null,
			company: f.company,
			role: f.role,
			link: f.link,
			salary: f.salary ?? null,
			fit_score: f.fit_score ?? null,
			referred_by: f.referred_by ?? null,
			status: f.status ?? "Not started",
			recruiter: f.recruiter ?? null,
			notes: f.notes ?? null,
			job_description: f.job_description ?? null,
			ending_substatus: f.ending_substatus ?? null,
			date_phone_screen: f.date_phone_screen ?? null,
			date_last_onsite: f.date_last_onsite ?? null,
			favorite: f.favorite ?? false,
			tags: Array.isArray(f.tags) ? f.tags : [],
		});
		return res.status(201).json(job);
	});

	router.put("/:id", (req, res) => {
		const f = req.body;

		const lengthError = validateJobFields(f);
		if (lengthError) return res.status(422).json({ error: lengthError });

		const substatusError = validateEndingSubstatus(
			f.status,
			f.ending_substatus ?? null,
		);
		if (substatusError) return res.status(422).json({ error: substatusError });

		const job = JobsDb.updateJob(
			db,
			Number(req.params.id),
			req.session.userId!,
			{
				date_applied: f.date_applied ?? null,
				company: f.company,
				role: f.role,
				link: f.link,
				salary: f.salary ?? null,
				fit_score: f.fit_score ?? null,
				referred_by: f.referred_by ?? null,
				status: f.status,
				recruiter: f.recruiter ?? null,
				notes: f.notes ?? null,
				job_description: f.job_description ?? null,
				ending_substatus: f.ending_substatus ?? null,
				date_phone_screen: f.date_phone_screen ?? null,
				date_last_onsite: f.date_last_onsite ?? null,
				favorite: f.favorite ?? false,
				tags: Array.isArray(f.tags) ? f.tags : [],
			},
		);
		if (!job) return res.status(404).json({ error: "Job not found" });
		return res.json(job);
	});

	router.delete("/:id", (req, res) => {
		const deleted = JobsDb.deleteJob(
			db,
			Number(req.params.id),
			req.session.userId!,
		);
		if (!deleted) return res.status(404).json({ error: "Job not found" });
		return res.json({ success: true });
	});

	return router;
}
