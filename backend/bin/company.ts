// CLI for managing the target_companies table.
//
// Usage:
//   tsx backend/bin/company.ts <subcommand> [args]
//
// Subcommands:
//   list [--tier <tier>]               List all companies with cooldown columns.
//                                      --tier filters by tier: faang | faang_adjacent | custom
//   show <name>                        Print all fields for a single company.
//   set  <name> <column> <value>       Update one column for a company.
//                                      Pass "null" as value to clear the field.
//   help                               Print this usage text.
//
// Writable columns for `set`:
//   application_cooldown_days     phone_screen_cooldown_days    onsite_cooldown_days
//   max_apps_per_period           apps_period_days              policy_summary
//   policy_url                    policy_confidence             policy_updated_at
//   user_notes                    hidden                        tier
//
// Examples:
//   tsx backend/bin/company.ts list
//   tsx backend/bin/company.ts list --tier faang
//   tsx backend/bin/company.ts show "Google"
//   tsx backend/bin/company.ts set "Google" application_cooldown_days 365
//   tsx backend/bin/company.ts set "Google" user_notes "null"

import Database from "better-sqlite3";
import { join } from "node:path";

const USAGE = `Usage: tsx backend/bin/company.ts <subcommand> [args]

Subcommands:
  list [--tier <tier>]               List all companies with cooldown columns.
                                     --tier filters by tier: faang | faang_adjacent | custom
  show <name>                        Print all fields for a single company.
  set  <name> <column> <value>       Update one column for a company.
                                     Pass "null" as value to clear the field.
  help                               Print this usage text.

Writable columns for \`set\`:
  application_cooldown_days     phone_screen_cooldown_days    onsite_cooldown_days
  max_apps_per_period           apps_period_days              policy_summary
  policy_url                    policy_confidence             policy_updated_at
  user_notes                    hidden                        tier

Examples:
  tsx backend/bin/company.ts list
  tsx backend/bin/company.ts list --tier faang
  tsx backend/bin/company.ts show "Google"
  tsx backend/bin/company.ts set "Google" application_cooldown_days 365
  tsx backend/bin/company.ts set "Google" user_notes null`;

const WRITABLE_COLUMNS = new Set([
  "application_cooldown_days",
  "phone_screen_cooldown_days",
  "onsite_cooldown_days",
  "max_apps_per_period",
  "apps_period_days",
  "policy_summary",
  "policy_url",
  "policy_confidence",
  "policy_updated_at",
  "user_notes",
  "hidden",
  "tier",
]);

const db = new Database(join(import.meta.dirname, "../jobman.db"), {
  readonly: false,
});

const [, , subcommand, ...rest] = process.argv;

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function cmdList(args: string[]) {
  let tier: string | null = null;
  if (args[0] === "--tier") {
    if (!args[1]) die("--tier requires a value");
    tier = args[1];
  }

  const rows = tier
    ? db
        .prepare(
          "SELECT name, tier, application_cooldown_days, phone_screen_cooldown_days, onsite_cooldown_days, user_notes FROM target_companies WHERE tier = ? ORDER BY name"
        )
        .all(tier)
    : db
        .prepare(
          "SELECT name, tier, application_cooldown_days, phone_screen_cooldown_days, onsite_cooldown_days, user_notes FROM target_companies ORDER BY tier, name"
        )
        .all();

  if (rows.length === 0) {
    console.log(tier ? `No companies found with tier "${tier}".` : "No companies found.");
    return;
  }

  console.table(rows);
}

function cmdShow(args: string[]) {
  const [name] = args;
  if (!name) die('show requires a company name, e.g.: show "Google"');

  const row = db
    .prepare("SELECT * FROM target_companies WHERE name = ?")
    .get(name);

  if (!row) die(`No company found with name "${name}"`);

  console.log(row);
}

function cmdSet(args: string[]) {
  const [name, column, rawValue] = args;
  if (!name || !column || rawValue === undefined) {
    die('set requires: <name> <column> <value>, e.g.: set "Google" application_cooldown_days 365');
  }

  if (!WRITABLE_COLUMNS.has(column)) {
    die(
      `"${column}" is not a writable column.\n\nWritable columns:\n  ${[...WRITABLE_COLUMNS].join(", ")}`
    );
  }

  const existing = db
    .prepare("SELECT id FROM target_companies WHERE name = ?")
    .get(name);
  if (!existing) die(`No company found with name "${name}"`);

  const value = rawValue === "null" ? null : rawValue;

  db.prepare(`UPDATE target_companies SET ${column} = ? WHERE name = ?`).run(
    value,
    name
  );

  console.log(`Updated "${name}" — ${column} = ${value === null ? "NULL" : JSON.stringify(value)}`);
}

switch (subcommand) {
  case "list":
    cmdList(rest);
    break;
  case "show":
    cmdShow(rest);
    break;
  case "set":
    cmdSet(rest);
    break;
  case "help":
  case "--help":
  case "-h":
    console.log(USAGE);
    break;
  default:
    console.error(subcommand ? `Unknown subcommand: "${subcommand}"\n` : "");
    console.error(USAGE);
    process.exit(1);
}
