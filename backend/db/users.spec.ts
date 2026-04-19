
import Database from "better-sqlite3";
import {
	createUserWithGoogleIdentity,
	findUserByGoogleId,
	findUserById,
	updateGoogleTokens,
} from "./users.js";

const SCHEMA = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT
  );
  CREATE TABLE user_identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  );
`;

function makeDb() {
	const db = new Database(":memory:");
	db.exec(SCHEMA);
	return db;
}

const GOOGLE_PARAMS = {
	accessToken: "access-token-abc",
	avatarUrl: "https://example.com/avatar.jpg",
	displayName: "Test User",
	email: "user@example.com",
	googleId: "google-uid-123",
	refreshToken: "refresh-token-xyz",
};

describe("users db", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = makeDb();
	});

	describe(findUserById, () => {
		it("returns undefined for non-existent user", () => {
			expect(findUserById(db, 999)).toBeUndefined();
		});

		it("returns the user when found", () => {
			const user = createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			const found = findUserById(db, user.id);
			expect(found?.id).toBe(user.id);
			expect(found?.email).toBe("user@example.com");
			expect(found?.display_name).toBe("Test User");
			expect(found?.avatar_url).toBe("https://example.com/avatar.jpg");
		});

		it("does not expose password or token fields", () => {
			const user = createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			const found = findUserById(db, user.id);
			expect(found).not.toHaveProperty("access_token");
			expect(found).not.toHaveProperty("refresh_token");
		});
	});

	describe(findUserByGoogleId, () => {
		it("returns undefined for unknown google id", () => {
			expect(findUserByGoogleId(db, "unknown-google-id")).toBeUndefined();
		});

		it("returns the user linked to the given google id", () => {
			const created = createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			const found = findUserByGoogleId(db, "google-uid-123");
			expect(found?.id).toBe(created.id);
			expect(found?.email).toBe("user@example.com");
		});

		it("does not match a different provider_user_id", () => {
			createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			expect(findUserByGoogleId(db, "different-google-uid")).toBeUndefined();
		});
	});

	describe(updateGoogleTokens, () => {
		it("updates access and refresh tokens for the given google id", () => {
			createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			updateGoogleTokens(db, "google-uid-123", "new-access-token", "new-refresh-token");
			const row = db
				.prepare(
					"SELECT access_token, refresh_token FROM user_identities WHERE provider_user_id = ?",
				)
				.get("google-uid-123") as { access_token: string; refresh_token: string };
			expect(row.access_token).toBe("new-access-token");
			expect(row.refresh_token).toBe("new-refresh-token");
		});

		it("sets refresh_token to null when null is passed", () => {
			createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			updateGoogleTokens(db, "google-uid-123", "new-access-token", null);
			const row = db
				.prepare(
					"SELECT refresh_token FROM user_identities WHERE provider_user_id = ?",
				)
				.get("google-uid-123") as { refresh_token: string | null };
			expect(row.refresh_token).toBeNull();
		});

		it("does nothing when the google id does not exist", () => {
			// Should not throw
			expect(() =>
				updateGoogleTokens(db, "nonexistent-id", "token", null),
			).not.toThrow();
		});
	});

	describe(createUserWithGoogleIdentity, () => {
		it("returns the created user with correct fields", () => {
			const user = createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			expect(user.id).toBeGreaterThan(0);
			expect(user.email).toBe("user@example.com");
			expect(user.display_name).toBe("Test User");
			expect(user.avatar_url).toBe("https://example.com/avatar.jpg");
		});

		it("creates both a users row and a user_identities row", () => {
			const user = createUserWithGoogleIdentity(db, GOOGLE_PARAMS);
			const identityRow = db
				.prepare("SELECT * FROM user_identities WHERE user_id = ?")
				.get(user.id) as { provider: string; provider_user_id: string; access_token: string };
			expect(identityRow.provider).toBe("google");
			expect(identityRow.provider_user_id).toBe("google-uid-123");
			expect(identityRow.access_token).toBe("access-token-abc");
		});

		it("handles null displayName and avatarUrl", () => {
			const user = createUserWithGoogleIdentity(db, {
				...GOOGLE_PARAMS,
				avatarUrl: null,
				displayName: null,
			});
			expect(user.display_name).toBeNull();
			expect(user.avatar_url).toBeNull();
		});

		it("handles null refreshToken", () => {
			const user = createUserWithGoogleIdentity(db, {
				...GOOGLE_PARAMS,
				refreshToken: null,
			});
			const identityRow = db
				.prepare("SELECT refresh_token FROM user_identities WHERE user_id = ?")
				.get(user.id) as { refresh_token: string | null };
			expect(identityRow.refresh_token).toBeNull();
		});
	});
});
