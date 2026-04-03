import type Database from "better-sqlite3";
import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as UsersDb from "../db/users.js";

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

export function createAuthRouter(db: Database.Database) {
	const router = express.Router();

	// Only register the Google strategy when credentials are present.
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
					const existing = UsersDb.findUserByGoogleId(db, profile.id);
					if (existing) {
						UsersDb.updateGoogleTokens(
							db,
							profile.id,
							_accessToken,
							_refreshToken ?? null,
						);
						return done(null, existing);
					}
					const newUser = UsersDb.createUserWithGoogleIdentity(db, {
						email: profile.emails?.[0]?.value ?? "",
						displayName: profile.displayName ?? null,
						avatarUrl: profile.photos?.[0]?.value ?? null,
						googleId: profile.id,
						accessToken: _accessToken,
						refreshToken: _refreshToken ?? null,
					});
					return done(null, newUser);
				},
			),
		);
	}

	router.get(
		"/google",
		passport.authenticate("google", { scope: ["openid", "email", "profile"] }),
	);

	router.get(
		"/google/callback",
		passport.authenticate("google", {
			session: false,
			failureRedirect: `${process.env["FRONTEND_URL"] ?? "http://localhost:5173"}/?error=auth_failed`,
		}),
		(req, res) => {
			req.session.userId = req.user!.id;
			res.redirect(process.env["FRONTEND_URL"] ?? "http://localhost:5173");
		},
	);

	router.post("/logout", (req, res) => {
		req.session.destroy((err) => {
			if (err) return res.status(500).json({ error: "Logout failed" });
			res.clearCookie("connect.sid");
			return res.json({ success: true });
		});
	});

	router.get("/me", (req, res) => {
		if (!req.session.userId)
			return res.status(401).json({ error: "Unauthorized" });
		const user = UsersDb.findUserById(db, req.session.userId);
		if (!user) return res.status(401).json({ error: "Unauthorized" });
		return res.json({
			id: user.id,
			email: user.email,
			displayName: user.display_name,
			avatarUrl: user.avatar_url,
		});
	});

	return router;
}
