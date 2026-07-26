import Database from "better-sqlite3";
import { applySchema, migrateSubscriptions } from "../db.js";
import {
	createFreeSubscription,
	getSubscription,
	setTier,
} from "./subscriptions.js";

function makeDb() {
	const db = new Database(":memory:");
	applySchema(db);
	return db;
}

function insertUser(db: Database.Database, id: number, email: string) {
	db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(id, email);
}

describe("subscriptions db", () => {
	let db: Database.Database;
	const USER_ID = 1;

	beforeEach(() => {
		db = makeDb();
		insertUser(db, USER_ID, "user@example.com");
	});

	describe("getSubscription", () => {
		it("returns undefined when no subscription exists", () => {
			expect(getSubscription(db, USER_ID)).toBeUndefined();
		});

		it("returns the user's subscription", () => {
			createFreeSubscription(db, USER_ID);
			const subscription = getSubscription(db, USER_ID);
			expect(subscription?.user_id).toBe(USER_ID);
			expect(subscription?.tier).toBe("free");
			expect(subscription?.status).toBe("active");
		});
	});

	describe("createFreeSubscription", () => {
		it("creates a free/active subscription row for the user", () => {
			const created = createFreeSubscription(db, USER_ID);
			expect(created.tier).toBe("free");
			expect(created.status).toBe("active");
			expect(created.user_id).toBe(USER_ID);
		});

		it("throws when a subscription already exists for the user", () => {
			createFreeSubscription(db, USER_ID);
			expect(() => createFreeSubscription(db, USER_ID)).toThrow(
				/UNIQUE constraint failed/,
			);
		});
	});

	describe("setTier", () => {
		it("updates the tier for the given user", () => {
			createFreeSubscription(db, USER_ID);
			setTier(db, USER_ID, "premium");
			expect(getSubscription(db, USER_ID)?.tier).toBe("premium");
		});

		it("does nothing when the user has no subscription row", () => {
			expect(() => setTier(db, USER_ID, "premium")).not.toThrow();
			expect(getSubscription(db, USER_ID)).toBeUndefined();
		});
	});

	describe("migrateSubscriptions", () => {
		it("backfills a free/active row for a pre-existing user with none", () => {
			migrateSubscriptions(db);
			const subscription = getSubscription(db, USER_ID);
			expect(subscription?.tier).toBe("free");
			expect(subscription?.status).toBe("active");
		});

		it("does not touch a user that already has a subscription row", () => {
			createFreeSubscription(db, USER_ID);
			setTier(db, USER_ID, "premium");
			migrateSubscriptions(db);
			expect(getSubscription(db, USER_ID)?.tier).toBe("premium");
		});

		it("is idempotent on re-run", () => {
			migrateSubscriptions(db);
			migrateSubscriptions(db);
			const rows = db
				.prepare("SELECT * FROM subscriptions WHERE user_id = ?")
				.all(USER_ID);
			expect(rows).toHaveLength(1);
		});
	});
});
