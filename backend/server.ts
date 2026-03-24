import express from "express";
import cors from "cors";
import type { DatabaseSync } from "node:sqlite"; // type-only: erased at compile time

const PORT = 3001;

interface JobRow {
	id: number;
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
	favorite: number;
	created_at: string;
}

// TODO: Share types with frontend
export const TERMINAL_STATUSES = new Set(["Rejected/Withdrawn", "Offer!"]);
export const VALID_ENDING_SUBSTATUSES = new Set([
	"Withdrawn",
	"Rejected",
	"Ghosted",
	"No response",
	"Offer declined",
	"Offer accepted",
]);

function validateEndingSubstatus(
	status: string,
	ending_substatus: unknown,
): string | null {
	if (TERMINAL_STATUSES.has(status)) {
		if (
			typeof ending_substatus !== "string" ||
			!VALID_ENDING_SUBSTATUSES.has(ending_substatus)
		) {
			return `ending_substatus is required for status "${status}" and must be one of: ${[...VALID_ENDING_SUBSTATUSES].join(", ")}`;
		}
	} else if (ending_substatus != null) {
		return `ending_substatus must be null when status is "${status}"`;
	}
	return null;
}

// SQLite stores booleans as 0/1 — convert for the client
function toClient(row: unknown) {
	const job = row as JobRow;
	return { ...job, favorite: !!job.favorite };
}

export function createApp(db: DatabaseSync) {
	const app = express();

	app.use(cors());
	app.use(express.json());

	// GET all jobs
	app.get("/api/jobs", (_req, res) => {
		const jobs = db
			.prepare("SELECT * FROM jobs ORDER BY created_at DESC")
			.all();
		res.json(jobs.map(toClient));
	});

	// POST create job
	app.post("/api/jobs", (req, res) => {
		const f = req.body;
		const substatusError = validateEndingSubstatus(
			f.status ?? "Not started",
			f.ending_substatus ?? null,
		);
		if (substatusError) return res.status(422).json({ error: substatusError });
		if (f.company && f.link) {
			const existing = db
				.prepare("SELECT id FROM jobs WHERE company = ? AND link = ? LIMIT 1")
				.get(f.company, f.link);
			if (existing) {
				return res.status(409).json({ error: "Job already exists" });
			}
		}
		const result = db
			.prepare(`
      INSERT INTO jobs (date_applied, company, role, link, salary, fit_score, referred_by, status, recruiter, notes, job_description, ending_substatus, favorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
			.run(
				f.date_applied ?? null,
				f.company,
				f.role,
				f.link,
				f.salary ?? null,
				f.fit_score ?? null,
				f.referred_by ?? null,
				f.status ?? "Not started",
				f.recruiter ?? null,
				f.notes ?? null,
				f.job_description ?? null,
				f.ending_substatus ?? null,
				f.favorite ? 1 : 0,
			);
		const job = db
			.prepare("SELECT * FROM jobs WHERE id = ?")
			.get(result.lastInsertRowid);
		return res.status(201).json(toClient(job));
	});

	// PUT update job
	app.put("/api/jobs/:id", (req, res) => {
		const { id } = req.params;
		const f = req.body;
		const substatusError = validateEndingSubstatus(
			f.status,
			f.ending_substatus ?? null,
		);
		if (substatusError) return res.status(422).json({ error: substatusError });
		const info = db
			.prepare(`
      UPDATE jobs SET
        date_applied = ?, company = ?, role = ?, link = ?, salary = ?,
        fit_score = ?, referred_by = ?, status = ?, recruiter = ?, notes = ?, job_description = ?, ending_substatus = ?, favorite = ?
      WHERE id = ?
    `)
			.run(
				f.date_applied ?? null,
				f.company,
				f.role,
				f.link,
				f.salary ?? null,
				f.fit_score ?? null,
				f.referred_by ?? null,
				f.status,
				f.recruiter ?? null,
				f.notes ?? null,
				f.job_description ?? null,
				f.ending_substatus ?? null,
				f.favorite ? 1 : 0,
				id,
			);
		if (info.changes === 0)
			return res.status(404).json({ error: "Job not found" });
		const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
		return res.json(toClient(job));
	});

	// DELETE job
	app.delete("/api/jobs/:id", (req, res) => {
		const info = db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
		if (info.changes === 0)
			return res.status(404).json({ error: "Job not found" });
		return res.json({ success: true });
	});

	return app;
}

// Production startup — dynamic import keeps db.ts (and node:sqlite) out of
// the module graph when server.ts is imported by tests.
if (process.env["NODE_ENV"] !== "test") {
	const { default: db } = await import("./db.js");
	const app = createApp(db);
	app.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`JobMan API running at http://localhost:${PORT}`);
	});
}
