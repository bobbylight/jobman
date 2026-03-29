import Database from "better-sqlite3";
import { join } from "node:path";

const db = new Database(join(import.meta.dirname, "jobman.db"));

// Enable foreign key enforcement
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT NOT NULL,
    display_name TEXT,
    avatar_url   TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS user_identities (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email            TEXT,
    access_token     TEXT,
    refresh_token    TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(provider, provider_user_id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id),
    date_applied     TEXT,
    company          TEXT NOT NULL,
    role             TEXT NOT NULL,
    link             TEXT NOT NULL,
    salary           TEXT,
    fit_score        TEXT,
    referred_by      TEXT,
    status           TEXT DEFAULT 'Not started',
    recruiter        TEXT,
    notes            TEXT,
    favorite         INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now')),
    job_description  TEXT,
    ending_substatus TEXT,
    date_phone_screen TEXT,
    date_last_onsite TEXT,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add user_id column to jobs if it doesn't exist yet (existing databases)
const jobColumns = db.pragma("table_info(jobs)") as { name: string }[];
if (!jobColumns.some((col) => col.name === "user_id")) {
	db.exec("ALTER TABLE jobs ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

// Seed user migration: if no users exist and SEED_GOOGLE_SUB is set,
// create the owner user and reassign all existing jobs to them.
const userCount = (
	db.prepare("SELECT COUNT(*) as count FROM users").get() as {
		count: number;
	}
).count;

if (userCount === 0) {
	const sub = process.env["SEED_GOOGLE_SUB"];
	const email = process.env["SEED_EMAIL"];

	if (sub && email) {
		const insertUser = db.prepare(
			"INSERT INTO users (email) VALUES (?) RETURNING id",
		);
		const insertIdentity = db.prepare(
			"INSERT INTO user_identities (user_id, provider, provider_user_id, email) VALUES (?, 'google', ?, ?)",
		);
		const assignJobs = db.prepare(
			"UPDATE jobs SET user_id = ? WHERE user_id IS NULL",
		);

		const migrate = db.transaction(() => {
			const user = insertUser.get(email) as { id: number };
			insertIdentity.run(user.id, sub, email);
			assignJobs.run(user.id);
			return user.id;
		});

		const userId = migrate();
		// eslint-disable-next-line no-console
		console.log(
			`Seed migration: created user ${userId} (${email}) and assigned existing jobs`,
		);
	}
}

export default db;
