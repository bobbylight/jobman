import { Router } from "express";
import type Database from "better-sqlite3";
import { getJobsForLink, getStats } from "../db/stats.js";
import { getActiveSearch } from "../db/jobSearches.js";

function resolveScopedSearchId(
	db: Database.Database,
	userId: number,
	rawScope: unknown,
): number | null {
	if (rawScope === "all") {
		return null;
	}
	return getActiveSearch(db, userId)?.id ?? null;
}

export function createStatsRouter(db: Database.Database) {
	const router = Router();

	router.get("/", (req, res) => {
		const userId = req.session.userId as number;
		const raw = req.query["window"];
		const window =
			raw === "30" || raw === "90" ? raw : ("all" as "all" | "90" | "30");
		const searchId = resolveScopedSearchId(db, userId, req.query["scope"]);

		const stats = getStats(db, userId, window, searchId);
		res.json(stats);
	});

	router.get("/link-jobs", (req, res) => {
		const userId = req.session.userId as number;
		const { from, to } = req.query;
		const rawWindow = req.query["window"];
		const window =
			rawWindow === "30" || rawWindow === "90" ? rawWindow : ("all" as const);
		const searchId = resolveScopedSearchId(db, userId, req.query["scope"]);

		if (typeof from !== "string" || typeof to !== "string") {
			res.status(400).json({ error: "Missing from or to" });
			return;
		}

		const jobs = getJobsForLink(db, userId, from, to, window, searchId);
		if (jobs === null) {
			res.status(400).json({ error: "Invalid link" });
			return;
		}

		res.json(jobs);
	});

	return router;
}
