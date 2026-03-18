import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
	favorite: number;
	created_at: string;
}

// SQLite stores booleans as 0/1 — convert for the client
function toClient(row: unknown) {
	const job = row as JobRow;
	return { ...job, favorite: !!job.favorite };
}

// GET all jobs
app.get("/api/jobs", (_req, res) => {
	const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
	res.json(jobs.map(toClient));
});

// POST create job
app.post("/api/jobs", (req, res) => {
	const f = req.body;
	const result = db
		.prepare(`
    INSERT INTO jobs (date_applied, company, role, link, salary, fit_score, referred_by, status, recruiter, notes, favorite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			f.favorite ? 1 : 0,
		);
	const job = db
		.prepare("SELECT * FROM jobs WHERE id = ?")
		.get(result.lastInsertRowid);
	res.status(201).json(toClient(job));
});

// PUT update job
app.put("/api/jobs/:id", (req, res) => {
	const { id } = req.params;
	const f = req.body;
	const info = db
		.prepare(`
    UPDATE jobs SET
      date_applied = ?, company = ?, role = ?, link = ?, salary = ?,
      fit_score = ?, referred_by = ?, status = ?, recruiter = ?, notes = ?, favorite = ?
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

if (process.env["NODE_ENV"] !== "test") {
	app.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`JobMan API running at http://localhost:${PORT}`);
	});
}

export { app };
