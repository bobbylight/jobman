import type Database from "better-sqlite3";

export type SubscriptionTier = "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "past_due";

export interface SubscriptionRow {
	id: number;
	user_id: number;
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	started_at: string;
	created_at: string;
	updated_at: string;
}

export function getSubscription(
	db: Database.Database,
	userId: number,
): SubscriptionRow | undefined {
	return db
		.prepare("SELECT * FROM subscriptions WHERE user_id = ?")
		.get(userId) as SubscriptionRow | undefined;
}

export function createFreeSubscription(
	db: Database.Database,
	userId: number,
): SubscriptionRow {
	const { lastInsertRowid } = db
		.prepare("INSERT INTO subscriptions (user_id) VALUES (?)")
		.run(userId);
	return db
		.prepare("SELECT * FROM subscriptions WHERE id = ?")
		.get(lastInsertRowid) as SubscriptionRow;
}

export function setTier(
	db: Database.Database,
	userId: number,
	tier: SubscriptionTier,
): void {
	db.prepare(
		`UPDATE subscriptions
     SET tier = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     WHERE user_id = ?`,
	).run(tier, userId);
}
