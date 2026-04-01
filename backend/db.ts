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

  CREATE TRIGGER IF NOT EXISTS jobs_updated_at
  AFTER UPDATE ON jobs FOR EACH ROW
  BEGIN
    UPDATE jobs SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
  END;

  CREATE TABLE IF NOT EXISTS interviews (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id                 INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interview_type         TEXT NOT NULL,
    interview_dttm         TEXT NOT NULL,
    interview_interviewers TEXT,
    interview_vibe         TEXT,
    interview_notes        TEXT
  );
`);

export default db;
