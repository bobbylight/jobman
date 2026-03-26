import { DatabaseSync } from "node:sqlite";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Status mapping ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "Not started": "Not started",
  "Resume sent": "Resume submitted",
  "Application submitted": "Resume submitted",
  "Chatted with recruiter": "Initial interview",
  "Recruiter/Initial Chat scheduled": "Initial interview",
  "Awaiting recruiter call scheduling": "Initial interview",
  "Initial eng screen": "Initial interview",
  "No good fit roles open": "Rejected/Withdrawn",
  "Job closed": "Rejected/Withdrawn",
};

function mapStatus(raw) {
  if (!raw) return "Not started";
  const mapped = STATUS_MAP[raw.trim()];
  if (!mapped) {
    console.warn(`  ⚠ Unknown status "${raw}" — defaulting to "Not started"`);
    return "Not started";
  }
  return mapped;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ── Fetch sheet data ──────────────────────────────────────────────────────────
console.log("Fetching sheet data...");
const raw = execSync(
  "gws sheets +read --spreadsheet 1tfaScAzDsPJDxaNDmeXsM15T-kbmXVoSkpFychFeHcE --range 'Jobs!A1:K200'",
  { encoding: "utf8" }
);
const json = raw.replace(/^Using keyring backend: keyring\n/, "");
const { values } = JSON.parse(json);
const [_header, ...rows] = values;
console.log(`Found ${rows.length} rows.\n`);

// ── Open DB ───────────────────────────────────────────────────────────────────
const db = new DatabaseSync(join(__dirname, "backend/jobman.db"));

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
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const insert = db.prepare(`
  INSERT INTO jobs (date_applied, company, role, link, salary, fit_score, referred_by, status, recruiter, notes, favorite)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── Insert rows ───────────────────────────────────────────────────────────────
let inserted = 0;
let failed = 0;

for (const row of rows) {
  const [date, company, role, link, salary, fitScore, referredBy, status, recruiter, notes, discoveryStrategy] = row;

  // Build notes: append discovery strategy if present
  let notesValue = notes || null;
  if (discoveryStrategy && discoveryStrategy.trim()) {
    notesValue = notesValue
      ? `${notesValue}\n[Discovery: ${discoveryStrategy.trim()}]`
      : `[Discovery: ${discoveryStrategy.trim()}]`;
  }

  // Special handling for the recruiter-only row
  if (company === "(recruiter)") {
    notesValue = `Recruiter-only contact — no specific role open.${notesValue ? " " + notesValue : ""}`;
  }

  try {
    insert.run(
      parseDate(date),
      company || "(unknown)",
      role || "",
      link || "",
      salary || null,
      fitScore || null,
      (referredBy && referredBy !== "None") ? referredBy : null,
      mapStatus(status),
      recruiter || null,
      notesValue,
      0,
    );
    console.log(`  OK  ${company} — ${role || "(no role)"}`);
    inserted++;
  } catch (err) {
    console.error(`  FAIL  ${company} — ${role}: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. ${inserted} inserted, ${failed} failed.`);
