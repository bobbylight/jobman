import type Database from "better-sqlite3";

export interface UserRow {
	id: number;
	email: string;
	display_name: string | null;
	avatar_url: string | null;
}

export function findUserById(
	db: Database.Database,
	userId: number,
): UserRow | undefined {
	return db
		.prepare("SELECT id, email, display_name, avatar_url FROM users WHERE id = ?")
		.get(userId) as UserRow | undefined;
}

export function findUserByGoogleId(
	db: Database.Database,
	googleId: string,
): UserRow | undefined {
	return db
		.prepare(
			`SELECT u.id, u.email, u.display_name, u.avatar_url
       FROM users u
       JOIN user_identities ui ON ui.user_id = u.id
       WHERE ui.provider = 'google' AND ui.provider_user_id = ?`,
		)
		.get(googleId) as UserRow | undefined;
}

export function updateGoogleTokens(
	db: Database.Database,
	googleId: string,
	accessToken: string,
	refreshToken: string | null,
): void {
	db.prepare(
		`UPDATE user_identities
     SET access_token = ?, refresh_token = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE provider = 'google' AND provider_user_id = ?`,
	).run(accessToken, refreshToken, googleId);
}

export function createUserWithGoogleIdentity(
	db: Database.Database,
	params: {
		email: string;
		displayName: string | null;
		avatarUrl: string | null;
		googleId: string;
		accessToken: string;
		refreshToken: string | null;
	},
): UserRow {
	const insertUser = db.prepare(
		"INSERT INTO users (email, display_name, avatar_url) VALUES (?, ?, ?) RETURNING id",
	);
	const insertIdentity = db.prepare(
		`INSERT INTO user_identities
       (user_id, provider, provider_user_id, email, access_token, refresh_token)
     VALUES (?, 'google', ?, ?, ?, ?)`,
	);

	return db.transaction(() => {
		const row = insertUser.get(
			params.email,
			params.displayName,
			params.avatarUrl,
		) as { id: number };
		insertIdentity.run(
			row.id,
			params.googleId,
			params.email,
			params.accessToken,
			params.refreshToken,
		);
		return {
			avatar_url: params.avatarUrl,
			display_name: params.displayName,
			email: params.email,
			id: row.id,
		};
	})();
}
