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
    date_applied     TEXT     CHECK(length(date_applied) <= 16),
    company          TEXT NOT NULL CHECK(length(company) <= 128),
    role             TEXT NOT NULL CHECK(length(role) <= 256),
    link             TEXT NOT NULL CHECK(length(link) <= 4096),
    salary           TEXT     CHECK(length(salary) <= 64),
    fit_score        TEXT     CHECK(length(fit_score) <= 32),
    referred_by      TEXT     CHECK(length(referred_by) <= 128),
    status           TEXT NOT NULL DEFAULT 'not_started'
                              CHECK(status IN ('not_started', 'applied', 'phone_screen',
                                               'interviewing', 'offer', 'rejected_or_withdrawn')),
    recruiter        TEXT     CHECK(length(recruiter) <= 128),
    notes            TEXT     CHECK(length(notes) <= 20000),
    favorite         INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now')),
    job_description  TEXT     CHECK(length(job_description) <= 20000),
    ending_substatus TEXT     CHECK(length(ending_substatus) <= 128),
    date_phone_screen TEXT     CHECK(length(date_phone_screen) <= 16),
    date_last_onsite  TEXT     CHECK(length(date_last_onsite) <= 16),
    date_offer_extended TEXT   CHECK(length(date_offer_extended) <= 16),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS jobs_updated_at
  AFTER UPDATE ON jobs FOR EACH ROW
  BEGIN
    UPDATE jobs SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
  END;

  CREATE TABLE IF NOT EXISTS interviews (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id                 INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    interview_stage        TEXT NOT NULL CHECK(length(interview_stage) <= 128),
    interview_dttm         TEXT NOT NULL CHECK(length(interview_dttm) <= 16),
    interview_interviewers TEXT     CHECK(length(interview_interviewers) <= 128),
    interview_type         TEXT     CHECK(length(interview_type) <= 128),
    interview_vibe         TEXT     CHECK(length(interview_vibe) <= 64),
    interview_notes        TEXT     CHECK(length(interview_notes) <= 4096),
    interview_result       TEXT     CHECK(interview_result IN ('passed', 'failed')),
    interview_feeling      TEXT     CHECK(interview_feeling IN ('aced', 'pretty_good', 'meh', 'struggled', 'flunked'))
  );

  CREATE TABLE IF NOT EXISTS interview_questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id   INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_type  TEXT NOT NULL CHECK(length(question_type) <= 128),
    question_text  TEXT NOT NULL CHECK(length(question_text) <= 4096),
    question_notes TEXT     CHECK(length(question_notes) <= 4096),
    difficulty     INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id
    ON interview_questions(interview_id);

  CREATE TABLE IF NOT EXISTS job_status_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status     TEXT NOT NULL CHECK(status IN ('not_started', 'applied', 'phone_screen',
                                             'interviewing', 'offer', 'rejected_or_withdrawn')),
    entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id
    ON job_status_history(job_id);

  CREATE TABLE IF NOT EXISTS job_tags (
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tag    TEXT NOT NULL CHECK(length(tag) <= 64),
    PRIMARY KEY (job_id, tag)
  );

  CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);

  CREATE TABLE IF NOT EXISTS target_companies (
    id                         INTEGER PRIMARY KEY AUTOINCREMENT,
    name                       TEXT    NOT NULL UNIQUE,
    tier                       TEXT    NOT NULL DEFAULT 'faang_adjacent'
                                       CHECK(tier IN ('faang', 'faang_adjacent', 'custom')),
    application_cooldown_days  INTEGER,
    phone_screen_cooldown_days INTEGER,
    onsite_cooldown_days       INTEGER,
    max_apps_per_period        INTEGER,
    apps_period_days           INTEGER,
    policy_summary             TEXT,
    policy_url                 TEXT,
    policy_confidence          TEXT
                               CHECK(policy_confidence IN ('official', 'community', 'estimate')),
    policy_updated_at          TEXT,
    user_notes                 TEXT,
    hidden                     INTEGER NOT NULL DEFAULT 0
  );
`);

// Seed target companies (INSERT OR IGNORE — safe to re-run)
db.exec(`
  INSERT OR IGNORE INTO target_companies
    (name, tier, application_cooldown_days, phone_screen_cooldown_days, onsite_cooldown_days, policy_summary, policy_confidence, max_apps_per_period, apps_period_days)
  VALUES
    ('Google',     'faang',          90,   180,  365, '90-day reapplication window; 6 months after phone screen; 12 months after onsite', 'community', 3,    30),
    ('Meta',       'faang',          NULL, 180,  365, '6 months after phone screen rejection; 12 months after onsite rejection',          'community', NULL, NULL),
    ('Apple',      'faang',          180,  180,  180, '6 months across all rejection stages',                                             'community', NULL, NULL),
    ('Amazon',     'faang',          180,  180,  180, '6 months after any rejection',                                                     'community', NULL, NULL),
    ('Netflix',    'faang',          NULL, NULL, 180, 'No formal policy; ~6 months informal cooling period after rejection',              'estimate',  NULL, NULL),
    ('Microsoft',  'faang',          90,   90,   180, '3 months after application or phone screen; 6 months after onsite',               'estimate',  NULL, NULL),
    ('Uber',       'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Lyft',       'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Snap',       'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Twitter/X',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Salesforce', 'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Adobe',      'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Stripe',     'faang_adjacent', NULL, 180,  180, '6 months after rejection',                                                        'community', 5,    30),
    ('Airbnb',     'faang_adjacent', NULL, 180,  365, '6 months after phone screen; 12 months after onsite rejection',                   'community', NULL, NULL),
    ('DoorDash',   'faang_adjacent', NULL, NULL, 180, '~6 months after rejection',                                                       'estimate',  NULL, NULL),
    ('Instacart',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Databricks', 'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('OpenAI',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Anthropic',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Nvidia',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Palantir',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('LinkedIn',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Spotify',    'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Block',      'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Coinbase',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Robinhood',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Pinterest',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Reddit',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Twilio',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Okta',       'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Datadog',    'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('MongoDB',    'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Confluent',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Snowflake',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('ServiceNow', 'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Workday',    'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Atlassian',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Cloudflare', 'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Twitch',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('GitHub',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('GitLab',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('HashiCorp',  'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Figma',      'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Notion',     'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Airtable',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Rippling',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Scale AI',   'faang_adjacent', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
`);

export default db;
