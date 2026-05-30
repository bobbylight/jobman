import cors from "cors";
import express from "express";
import session from "express-session";
import passport from "passport";
import SqliteStoreFactory from "better-sqlite3-session-store";
import type Database from "better-sqlite3";
import { createAuthRouter, registerStrategies } from "./routes/auth.js";
import { createInterviewInsightsRouter } from "./routes/interviewInsights.js";
import {
	createInterviewSearchRouter,
	createInterviewsRouter,
} from "./routes/interviews.js";
import { createJobsRouter } from "./routes/jobs.js";
import { createRadarRouter } from "./routes/radar.js";
import { createStatsRouter } from "./routes/stats.js";

// Augment express-session to include our custom fields
declare module "express-session" {
	interface SessionData {
		userId: number;
	}
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

export function createApp(db: Database.Database) {
	const app = express();

	app.use(
		cors({
			credentials: true,
			origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173",
		}),
	);
	app.use(express.json());

	const SqliteStore = SqliteStoreFactory(session);
	app.use(
		session({
			cookie: {
				httpOnly: true,
				maxAge: 7 * 24 * 60 * 60 * 1000,
				sameSite: "lax",
				secure: process.env["NODE_ENV"] === "production", // 7 days
			},
			resave: false,
			saveUninitialized: false,
			secret: process.env["SESSION_SECRET"] ?? "dev-secret",
			store: new SqliteStore({ client: db }),
		}),
	);

	registerStrategies(db);
	app.use(passport.initialize());

	app.use("/api/auth", createAuthRouter(db));
	app.use("/api/interviews", requireAuth, createInterviewSearchRouter(db));
	app.use("/api/jobs", requireAuth, createJobsRouter(db));
	app.use(
		"/api/jobs/:jobId/interviews",
		requireAuth,
		createInterviewsRouter(db),
	);
	app.use("/api/radar", requireAuth, createRadarRouter(db));
	app.use("/api/stats", requireAuth, createStatsRouter(db));
	app.use(
		"/api/interview-insights",
		requireAuth,
		createInterviewInsightsRouter(db),
	);

	app.use(
		(
			err: unknown,
			_req: express.Request,
			res: express.Response,
			_next: express.NextFunction,
		) => {
			res.status(500).json({ error: "Internal server error" });
		},
	);

	return app;
}
