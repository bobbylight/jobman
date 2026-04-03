import { Router } from "express";
import type Database from "better-sqlite3";
import { getStats } from "../db/stats.js";

export function createStatsRouter(db: Database.Database) {
	const router = Router();

	router.get("/", (req, res) => {
		const userId = req.session.userId as number;
		const raw = req.query["window"];
		const window =
			raw === "30" || raw === "90" ? raw : ("all" as "all" | "90" | "30");

		const stats = getStats(db, userId, window);
		res.json(stats);
	});

	return router;
}
