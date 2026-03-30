import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import SqliteStoreFactory from "better-sqlite3-session-store";
import type Database from "better-sqlite3"; // type-only: erased at compile time

// Augment express-session to include our custom fields
declare module "express-session" {
	interface SessionData {
		userId: number;
	}
}

// Augment passport's req.user type
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface User {
			id: number;
			email: string;
			display_name: string | null;
			avatar_url: string | null;
		}
	}
}

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
	date_phone_screen: string | null;
	date_last_onsite: string | null;
	favorite: number;
	created_at: string;
	updated_at: string;
}

interface UserRow {
	id: number;
	email: string;
	display_name: string | null;
	avatar_url: string | null;
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

function requireAuth(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) {
	if (!req.session.userId) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	next();
}

export function createApp(db: Database) {
	const app = express();

	app.use(
		cors({
			origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
			credentials: true,
		}),
	);
	app.use(express.json());

	// Session middleware backed by SQLite
	const SqliteStore = SqliteStoreFactory(session);
	app.use(
		session({
			secret: process.env["SESSION_SECRET"] ?? "dev-secret",
			resave: false,
			saveUninitialized: false,
			store: new SqliteStore({ client: db }),
			cookie: {
				httpOnly: true,
				secure: process.env["NODE_ENV"] === "production",
				sameSite: "lax",
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			},
		}),
	);

	// Passport strategy — only registered when credentials are present.
	// Auth routes exist in all environments but are non-functional in tests
	// (no credentials → no strategy registered → passport.authenticate returns 500).
	if (process.env["GOOGLE_CLIENT_ID"]) {
		passport.use(
			new GoogleStrategy(
				{
					clientID: process.env["GOOGLE_CLIENT_ID"],
					clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
					callbackURL: process.env["GOOGLE_CALLBACK_URL"] ?? "",
				},
				(_accessToken, _refreshToken, profile, done) => {
					const existing = db
						.prepare(
							`SELECT u.id, u.email, u.display_name, u.avatar_url
               FROM users u
               JOIN user_identities ui ON ui.user_id = u.id
               WHERE ui.provider = 'google' AND ui.provider_user_id = ?`,
						)
						.get(profile.id) as UserRow | undefined;

					if (existing) {
						db.prepare(
							`UPDATE user_identities
               SET access_token = ?, refresh_token = ?,
                   updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
               WHERE provider = 'google' AND provider_user_id = ?`,
						).run(_accessToken, _refreshToken ?? null, profile.id);
						return done(null, existing);
					}

					const email = profile.emails?.[0]?.value ?? "";
					const displayName = profile.displayName ?? null;
					const avatarUrl = profile.photos?.[0]?.value ?? null;

					const insertUser = db.prepare(
						"INSERT INTO users (email, display_name, avatar_url) VALUES (?, ?, ?) RETURNING id",
					);
					const insertIdentity = db.prepare(
						`INSERT INTO user_identities
               (user_id, provider, provider_user_id, email, access_token, refresh_token)
             VALUES (?, 'google', ?, ?, ?, ?)`,
					);

					const newUser = db.transaction(() => {
						const row = insertUser.get(email, displayName, avatarUrl) as {
							id: number;
						};
						insertIdentity.run(
							row.id,
							profile.id,
							email,
							_accessToken,
							_refreshToken ?? null,
						);
						return {
							id: row.id,
							email,
							display_name: displayName,
							avatar_url: avatarUrl,
						};
					})();

					return done(null, newUser);
				},
			),
		);
	}

	app.use(passport.initialize());

	// --- Auth routes ---

	app.get(
		"/api/auth/google",
		passport.authenticate("google", { scope: ["openid", "email", "profile"] }),
	);

	app.get(
		"/api/auth/google/callback",
		passport.authenticate("google", {
			session: false,
			failureRedirect: `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/?error=auth_failed`,
		}),
		(req, res) => {
			req.session.userId = req.user!.id;
			res.redirect(process.env["FRONTEND_URL"] ?? "http://localhost:5173");
		},
	);

	app.post("/api/auth/logout", (req, res) => {
		req.session.destroy((err) => {
			if (err) return res.status(500).json({ error: "Logout failed" });
			res.clearCookie("connect.sid");
			return res.json({ success: true });
		});
	});

	app.get("/api/auth/me", (req, res) => {
		if (!req.session.userId)
			return res.status(401).json({ error: "Unauthorized" });
		const user = db
			.prepare(
				"SELECT id, email, display_name, avatar_url FROM users WHERE id = ?",
			)
			.get(req.session.userId) as UserRow | undefined;
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		return res.json({
			id: user.id,
			email: user.email,
			displayName: user.display_name,
			avatarUrl: user.avatar_url,
		});
	});

	// --- Job routes ---

	app.use("/api/jobs", requireAuth);

	// GET all jobs
	app.get("/api/jobs", (req, res) => {
		const jobs = db
			.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC")
			.all(req.session.userId);
		res.json(jobs.map(toClient));
	});

	// POST create job
	app.post("/api/jobs", (req, res) => {
		const f = req.body;
		const userId = req.session.userId;
		const substatusError = validateEndingSubstatus(
			f.status ?? "Not started",
			f.ending_substatus ?? null,
		);
		if (substatusError) return res.status(422).json({ error: substatusError });
		if (f.company && f.link) {
			const existing = db
				.prepare(
					"SELECT id FROM jobs WHERE company = ? AND link = ? AND user_id = ? LIMIT 1",
				)
				.get(f.company, f.link, userId);
			if (existing) {
				return res.status(409).json({ error: "Job already exists" });
			}
		}
		const result = db
			.prepare(`
      INSERT INTO jobs (user_id, date_applied, company, role, link, salary, fit_score, referred_by, status, recruiter, notes, job_description, ending_substatus, date_phone_screen, date_last_onsite, favorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
			.run(
				userId,
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
				f.date_phone_screen ?? null,
				f.date_last_onsite ?? null,
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
        fit_score = ?, referred_by = ?, status = ?, recruiter = ?, notes = ?, job_description = ?, ending_substatus = ?, date_phone_screen = ?, date_last_onsite = ?, favorite = ?
      WHERE id = ? AND user_id = ?
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
				f.date_phone_screen ?? null,
				f.date_last_onsite ?? null,
				f.favorite ? 1 : 0,
				id,
				req.session.userId,
			);
		if (info.changes === 0)
			return res.status(404).json({ error: "Job not found" });
		const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
		return res.json(toClient(job));
	});

	// DELETE job
	app.delete("/api/jobs/:id", (req, res) => {
		const info = db
			.prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?")
			.run(req.params.id, req.session.userId);
		if (info.changes === 0)
			return res.status(404).json({ error: "Job not found" });
		return res.json({ success: true });
	});

	return app;
}

// Production startup — dynamic import keeps db.ts out of the module graph
// when server.ts is imported by tests. dotenv is loaded first so env vars
// are available before db.ts runs its seed migration.
if (process.env["NODE_ENV"] !== "test") {
	await import("dotenv/config");
	const { default: db } = await import("./db.js");
	const app = createApp(db);
	app.listen(PORT, () => {
		// eslint-disable-next-line no-console
		console.log(`JobMan API running at http://localhost:${PORT}`);
	});
}
