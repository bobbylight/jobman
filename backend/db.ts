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

  CREATE TABLE IF NOT EXISTS interview_questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id   INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_type  TEXT NOT NULL,
    question_text  TEXT NOT NULL,
    question_notes TEXT,
    difficulty     INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id
    ON interview_questions(interview_id);

  CREATE TABLE IF NOT EXISTS job_status_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status     TEXT NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id
    ON job_status_history(job_id);
`);

// One-time backfill: synthesise history rows from existing date columns for
// jobs that don't yet have any history entries for a given status.
db.exec(`
  INSERT INTO job_status_history (job_id, status, entered_at)
  SELECT j.id, 'Not started',
    COALESCE(
      -- Place 1 second before the earliest existing history entry so ordering is correct
      (SELECT datetime(MIN(h.entered_at), '-1 second') FROM job_status_history h WHERE h.job_id = j.id),
      j.created_at
    )
  FROM jobs j
  WHERE NOT EXISTS (
    SELECT 1 FROM job_status_history h
    WHERE h.job_id = j.id AND h.status = 'Not started'
  );

  INSERT INTO job_status_history (job_id, status, entered_at)
  SELECT j.id, 'Resume submitted', j.date_applied
  FROM jobs j
  WHERE j.date_applied IS NOT NULL
    AND j.status <> 'Not started'
    AND NOT EXISTS (
      SELECT 1 FROM job_status_history h
      WHERE h.job_id = j.id AND h.status = 'Resume submitted'
    );

  INSERT INTO job_status_history (job_id, status, entered_at)
  SELECT j.id, 'Phone screen', j.date_phone_screen
  FROM jobs j
  WHERE j.date_phone_screen IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM job_status_history h
      WHERE h.job_id = j.id AND h.status = 'Phone screen'
    );

  INSERT INTO job_status_history (job_id, status, entered_at)
  SELECT j.id, 'Interviewing', j.date_last_onsite
  FROM jobs j
  WHERE j.date_last_onsite IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM job_status_history h
      WHERE h.job_id = j.id AND h.status = 'Interviewing'
    );

  -- Fix any 'Not started' rows whose timestamp isn't before all other entries
  UPDATE job_status_history
  SET entered_at = (
    SELECT datetime(MIN(h2.entered_at), '-1 second')
    FROM job_status_history h2
    WHERE h2.job_id = job_status_history.job_id
      AND h2.id <> job_status_history.id
  )
  WHERE status = 'Not started'
    AND entered_at >= (
      SELECT MIN(h2.entered_at)
      FROM job_status_history h2
      WHERE h2.job_id = job_status_history.job_id
        AND h2.status <> 'Not started'
    );

  -- Remove spurious 'Resume submitted' backfill entries for jobs still in 'Not started'
  DELETE FROM job_status_history
  WHERE status = 'Resume submitted'
    AND job_id IN (
      SELECT id FROM jobs WHERE status = 'Not started'
    );
`);

export default db;
