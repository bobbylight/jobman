import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const db = new DatabaseSync(join(import.meta.dirname, "jobman.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_applied TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT NOT NULL,
    salary TEXT,
    fit_score TEXT,
    referred_by TEXT,
    status TEXT DEFAULT 'Not started',
    recruiter TEXT,
    notes TEXT,
    favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    job_description TEXT
  )
`);

export default db;
