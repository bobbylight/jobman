import type Database from "better-sqlite3";
import { Router } from "express";
import * as JobsDb from "../db/jobs.js";
import * as JobSearchesDb from "../db/jobSearches.js";
import * as OffersDb from "../db/offers.js";

function getJobInOfferStatus(
	db: Database.Database,
	jobId: number,
	userId: number,
	res: Parameters<Parameters<ReturnType<typeof Router>["get"]>[1]>[1],
): boolean {
	const job = JobsDb.findJob(db, jobId, userId);
	if (!job) {
		res.status(404).json({ error: "Job not found" });
		return false;
	}
	if (job.status !== "offer") {
		res.status(400).json({ error: "Job is not in offer status" });
		return false;
	}
	if (!JobSearchesDb.isJobInActiveSearch(db, jobId, userId)) {
		res
			.status(403)
			.json({ error: "Cannot modify an offer for a job in a closed search round" });
		return false;
	}
	return true;
}

export function createOffersRouter(db: Database.Database) {
	const router = Router({ mergeParams: true });

	// GET /api/jobs/:jobId/offer
	router.get("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		const userId = req.session.userId!;

		const job = JobsDb.findJob(db, Number(jobId), userId);
		if (!job) {return res.status(404).json({ error: "Job not found" });}

		const offer = OffersDb.getOffer(db, Number(jobId));
		if (!offer) {return res.status(404).json({ error: "Offer not found" });}
		return res.json(offer);
	});

	// POST /api/jobs/:jobId/offer
	router.post("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		const userId = req.session.userId!;
		const f = req.body as Record<string, unknown>;

		if (!getJobInOfferStatus(db, Number(jobId), userId, res)) {return;}

		if (OffersDb.getOffer(db, Number(jobId))) {
			return res.status(409).json({ error: "Offer already exists for this job" });
		}

		const offer = OffersDb.createOffer(db, {
			job_id: Number(jobId),
			base_pay_amount: (f.base_pay_amount as number | null) ?? null,
			target_bonus_percent: (f.target_bonus_percent as number | null) ?? null,
			equity_amount: (f.equity_amount as number | null) ?? null,
			equity_vesting_years: (f.equity_vesting_years as number | null) ?? null,
			equity_type: (f.equity_type as string | null) ?? null,
			signing_bonus_amount: (f.signing_bonus_amount as number | null) ?? null,
			wellness_stipend_amount: (f.wellness_stipend_amount as number | null) ?? null,
			other_amount: (f.other_amount as number | null) ?? null,
			other_label: (f.other_label as string | null) ?? null,
			other_is_recurring: Boolean(f.other_is_recurring),
			k401_match_percent: (f.k401_match_percent as number | null) ?? null,
			offer_deadline: (f.offer_deadline as string | null) ?? null,
			notes: (f.notes as string | null) ?? null,
		});
		return res.status(201).json(offer);
	});

	// PUT /api/jobs/:jobId/offer
	router.put("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		const userId = req.session.userId!;
		const f = req.body as Record<string, unknown>;

		if (!getJobInOfferStatus(db, Number(jobId), userId, res)) {return;}

		const offer = OffersDb.updateOffer(db, Number(jobId), {
			base_pay_amount: (f.base_pay_amount as number | null) ?? null,
			target_bonus_percent: (f.target_bonus_percent as number | null) ?? null,
			equity_amount: (f.equity_amount as number | null) ?? null,
			equity_vesting_years: (f.equity_vesting_years as number | null) ?? null,
			equity_type: (f.equity_type as string | null) ?? null,
			signing_bonus_amount: (f.signing_bonus_amount as number | null) ?? null,
			wellness_stipend_amount: (f.wellness_stipend_amount as number | null) ?? null,
			other_amount: (f.other_amount as number | null) ?? null,
			other_label: (f.other_label as string | null) ?? null,
			other_is_recurring: Boolean(f.other_is_recurring),
			k401_match_percent: (f.k401_match_percent as number | null) ?? null,
			offer_deadline: (f.offer_deadline as string | null) ?? null,
			notes: (f.notes as string | null) ?? null,
		});
		if (!offer) {return res.status(404).json({ error: "Offer not found" });}
		return res.json(offer);
	});

	// DELETE /api/jobs/:jobId/offer
	router.delete("/", (req, res) => {
		const { jobId } = req.params as { jobId: string };
		const userId = req.session.userId!;

		const job = JobsDb.findJob(db, Number(jobId), userId);
		if (!job) {return res.status(404).json({ error: "Job not found" });}
		if (!JobSearchesDb.isJobInActiveSearch(db, Number(jobId), userId)) {
			return res
				.status(403)
				.json({ error: "Cannot modify an offer for a job in a closed search round" });
		}

		const deleted = OffersDb.deleteOffer(db, Number(jobId));
		if (!deleted) {return res.status(404).json({ error: "Offer not found" });}
		return res.status(204).send();
	});

	return router;
}

export function createOffersListRouter(db: Database.Database) {
	const router = Router();

	// GET /api/offers — all jobs in offer status with their offer (or null)
	router.get("/", (req, res) => {
		const results = OffersDb.getOffersWithJobs(db, req.session.userId!);
		return res.json(results);
	});

	return router;
}
