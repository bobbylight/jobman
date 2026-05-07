import { Router } from "express";
import type Database from "better-sqlite3";
import { getRadar, patchRadarEntry } from "../db/radar.js";

export function createRadarRouter(db: Database.Database) {
	const router = Router();

	router.get("/", (req, res) => {
		const userId = req.session.userId as number;
		const includeHidden = req.query["includeHidden"] === "true";
		res.json(getRadar(db, userId, includeHidden));
	});

	router.patch("/:id", (req, res) => {
		const id = Number(req.params.id);
		if (isNaN(id)) {
			return res.status(400).json({ error: "Invalid id" });
		}

		const updated = patchRadarEntry(db, id, req.body);
		if (!updated) {
			return res.status(404).json({ error: "Not found" });
		}

		return res.json({ success: true });
	});

	return router;
}
