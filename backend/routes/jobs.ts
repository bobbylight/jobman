import type Database from "better-sqlite3";
import { Router } from "express";
import * as JobsDb from "../db/jobs.js";
import type { JobView } from "../db/jobs.js";
import * as JobSearchesDb from "../db/jobSearches.js";
import { validateEndingSubstatus, validateJobFields, validateOfferDate } from "../validators.js";
import * as OffersDb from "../db/offers.js";

export function createJobsRouter(db: Database.Database) {
	const router = Router();

	router.get("/", (req, res) => {
		const view: JobView = req.query.view === "full" ? "full" : "summary";
		const userId = req.session.userId!;

		if (req.query.search_id !== undefined) {
			const searchId = Number(req.query.search_id);
			if (isNaN(searchId)) {
				return res.status(400).json({ error: "Invalid search_id" });
			}
			const search = JobSearchesDb.getSearch(db, searchId, userId);
			if (!search) {
				return res.status(404).json({ error: "Job search not found" });
			}
			return res.json(JobsDb.listJobs(db, userId, view, search.id));
		}

		const active = JobSearchesDb.getActiveSearch(db, userId);
		return res.json(active ? JobsDb.listJobs(db, userId, view, active.id) : []);
	});

	router.get("/:jobId", (req, res) => {
		const job = JobsDb.findJob(db, Number(req.params.jobId), req.session.userId!);
		if (!job) {return res.status(404).json({ error: "Job not found" });}
		return res.json(job);
	});

	router.post("/", (req, res) => {
		const f = req.body;
		const userId = req.session.userId!;

		const lengthError = validateJobFields(f);
		if (lengthError) {return res.status(422).json({ error: lengthError });}

		const substatusError = validateEndingSubstatus(
			f.status ?? "not_started",
			f.ending_substatus ?? null,
		);
		if (substatusError) {return res.status(422).json({ error: substatusError });}

		const offerDateError = validateOfferDate(
			f.status ?? "not_started",
			f.date_offer_extended ?? null,
		);
		if (offerDateError) {return res.status(422).json({ error: offerDateError });}

		if (f.company && f.link && JobsDb.jobExists(db, f.company, f.link, userId)) {
			return res.status(409).json({ error: "Job already exists" });
		}

		const active = JobSearchesDb.getOrCreateActiveSearch(db, userId);

		const job = JobsDb.createJob(db, {
			company: f.company,
			date_applied: f.date_applied ?? null,
			date_last_onsite: f.date_last_onsite ?? null,
			date_offer_extended: f.date_offer_extended ?? null,
			date_phone_screen: f.date_phone_screen ?? null,
			ending_substatus: f.ending_substatus ?? null,
			favorite: f.favorite ?? false,
			fit_score: f.fit_score ?? null,
			job_description: f.job_description ?? null,
			link: f.link,
			notes: f.notes ?? null,
			recruiter: f.recruiter ?? null,
			referred_by: f.referred_by ?? null,
			role: f.role,
			salary: f.salary ?? null,
			search_id: active.id,
			status: f.status ?? "not_started",
			tags: Array.isArray(f.tags) ? f.tags : [],
			user_id: userId,
		});
		return res.status(201).json(job);
	});

	router.put("/:id", (req, res) => {
		const f = req.body;

		const lengthError = validateJobFields(f);
		if (lengthError) {return res.status(422).json({ error: lengthError });}

		const substatusError = validateEndingSubstatus(
			f.status,
			f.ending_substatus ?? null,
		);
		if (substatusError) {return res.status(422).json({ error: substatusError });}

		const offerDateError = validateOfferDate(
			f.status,
			f.date_offer_extended ?? null,
		);
		if (offerDateError) {return res.status(422).json({ error: offerDateError });}

		const jobId = Number(req.params.id);
		const userId = req.session.userId!;
		const currentJob = JobsDb.findJob(db, jobId, userId);
		if (!currentJob) {return res.status(404).json({ error: "Job not found" });}
		if (!JobSearchesDb.isJobInActiveSearch(db, jobId, userId)) {
			return res
				.status(409)
				.json({ error: "Cannot modify a job in a closed search round" });
		}
		if (f.status !== undefined && currentJob.status === "offer" && f.status !== "offer") {
			OffersDb.deleteOffer(db, jobId);
		}

		const job = JobsDb.updateJob(
			db,
			jobId,
			userId,
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
				// Only update notes/job_description when explicitly present in the
				// Request body — omitting them preserves the existing DB value.
				...("notes" in f && { notes: f.notes ?? null }),
				...("job_description" in f && { job_description: f.job_description ?? null }),
				ending_substatus: f.ending_substatus ?? null,
				date_phone_screen: f.date_phone_screen ?? null,
				date_last_onsite: f.date_last_onsite ?? null,
				date_offer_extended: f.date_offer_extended ?? null,
				favorite: f.favorite ?? false,
				tags: Array.isArray(f.tags) ? f.tags : [],
			},
		);
		if (!job) {return res.status(404).json({ error: "Job not found" });}
		return res.json(job);
	});

	router.delete("/:id", (req, res) => {
		const jobId = Number(req.params.id);
		const userId = req.session.userId!;
		if (!JobsDb.findJob(db, jobId, userId)) {
			return res.status(404).json({ error: "Job not found" });
		}
		if (!JobSearchesDb.isJobInActiveSearch(db, jobId, userId)) {
			return res
				.status(409)
				.json({ error: "Cannot modify a job in a closed search round" });
		}
		const deleted = JobsDb.deleteJob(db, jobId, userId);
		if (!deleted) {return res.status(404).json({ error: "Job not found" });}
		return res.json({ success: true });
	});

	return router;
}
