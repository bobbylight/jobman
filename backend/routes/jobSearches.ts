import type Database from "better-sqlite3";
import { Router } from "express";
import * as JobSearchesDb from "../db/jobSearches.js";
import { validateJobSearchFields } from "../validators.js";

export function createJobSearchesRouter(db: Database.Database) {
	const router = Router();

	// GET /api/job-searches — all rounds for the user, newest first
	router.get("/", (req, res) => {
		const userId = req.session.userId!;
		res.json(JobSearchesDb.listSearches(db, userId));
	});

	// GET /api/job-searches/active
	router.get("/active", (req, res) => {
		const userId = req.session.userId!;
		const active = JobSearchesDb.getActiveSearch(db, userId);
		if (!active) {
			return res.status(404).json({ error: "No active job search" });
		}
		return res.json(active);
	});

	// GET /api/job-searches/:id — a specific round (active or closed), scoped to the user
	router.get("/:id", (req, res) => {
		const userId = req.session.userId!;
		const id = Number(req.params.id);
		if (isNaN(id)) {
			return res.status(400).json({ error: "Invalid id" });
		}
		const search = JobSearchesDb.getSearch(db, id, userId);
		if (!search) {
			return res.status(404).json({ error: "Job search not found" });
		}
		return res.json(search);
	});

	// POST /api/job-searches — closes the current active round and starts a new one
	router.post("/", (req, res) => {
		const userId = req.session.userId!;
		const f = req.body as Record<string, unknown>;

		const validationError = validateJobSearchFields(f);
		if (validationError) {
			return res.status(400).json({ error: validationError });
		}

		const active = JobSearchesDb.getActiveSearch(db, userId);
		if (active) {
			const blocking = JobSearchesDb.listBlockingJobs(db, active.id);
			if (blocking.length > 0) {
				return res.status(409).json({
					error: "Active job search has jobs that aren't resolved yet",
					blockingJobs: blocking,
				});
			}
		}

		const created = JobSearchesDb.startNewSearch(
			db,
			userId,
			f.name as string,
			(f.notes as string | null) ?? null,
		);
		return res.status(201).json(created);
	});

	// PATCH /api/job-searches/:id — rename or edit notes (active or closed round)
	router.patch("/:id", (req, res) => {
		const userId = req.session.userId!;
		const id = Number(req.params.id);
		if (isNaN(id)) {
			return res.status(400).json({ error: "Invalid id" });
		}
		const f = req.body as Record<string, unknown>;

		const validationError = validateJobSearchFields(f);
		if (validationError) {
			return res.status(400).json({ error: validationError });
		}

		const updated = JobSearchesDb.updateSearch(db, id, userId, {
			name: f.name as string,
			notes: (f.notes as string | null) ?? null,
		});
		if (!updated) {
			return res.status(404).json({ error: "Job search not found" });
		}
		return res.json(updated);
	});

	return router;
}
