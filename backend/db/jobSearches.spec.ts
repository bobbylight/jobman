import Database from "better-sqlite3";
import { applySchema } from "../db.js";
import {
	getActiveSearch,
	getSearch,
	listBlockingJobs,
	listSearches,
	startNewSearch,
	updateSearch,
} from "./jobSearches.js";

function makeDb() {
	const db = new Database(":memory:");
	applySchema(db);
	return db;
}

function insertJob(
	db: Database.Database,
	userId: number,
	overrides: { status?: string; search_id?: number | null } = {},
) {
	const result = db
		.prepare(
			"INSERT INTO jobs (user_id, company, role, link, status, search_id) VALUES (?, 'Acme', 'Engineer', 'https://example.com', ?, ?)",
		)
		.run(userId, overrides.status ?? "applied", overrides.search_id ?? null);
	return Number(result.lastInsertRowid);
}

describe("jobSearches db", () => {
	let db: Database.Database;
	const USER_ID = 1;
	const OTHER_USER_ID = 2;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(
			USER_ID,
			"user@example.com",
		);
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(
			OTHER_USER_ID,
			"other@example.com",
		);
	});

	describe("startNewSearch", () => {
		it("creates an active round when the user has none yet", () => {
			const created = startNewSearch(db, USER_ID, "Search 1", null);
			expect(created.name).toBe("Search 1");
			expect(created.closed_at).toBeNull();
			expect(getActiveSearch(db, USER_ID)?.id).toBe(created.id);
		});

		it("closes the previous active round when starting a new one", () => {
			const first = startNewSearch(db, USER_ID, "Search 1", null);
			const second = startNewSearch(db, USER_ID, "Search 2", "fresh start");

			const closedFirst = getSearch(db, first.id, USER_ID);
			expect(closedFirst?.closed_at).not.toBeNull();

			const active = getActiveSearch(db, USER_ID);
			expect(active?.id).toBe(second.id);
			expect(active?.notes).toBe("fresh start");
		});

		it("does not affect other users' active rounds", () => {
			startNewSearch(db, OTHER_USER_ID, "Other's search", null);
			startNewSearch(db, USER_ID, "My search", null);
			expect(getActiveSearch(db, OTHER_USER_ID)?.name).toBe("Other's search");
		});
	});

	describe("listSearches", () => {
		it("returns rounds newest first", () => {
			const first = startNewSearch(db, USER_ID, "Search 1", null);
			const second = startNewSearch(db, USER_ID, "Search 2", null);
			const rows = listSearches(db, USER_ID);
			expect(rows.map((r) => r.id)).toStrictEqual([second.id, first.id]);
		});

		it("does not return other users' rounds", () => {
			startNewSearch(db, OTHER_USER_ID, "Other's search", null);
			expect(listSearches(db, USER_ID)).toStrictEqual([]);
		});
	});

	describe("listBlockingJobs", () => {
		it("returns jobs not in a terminal status", () => {
			const search = startNewSearch(db, USER_ID, "Search 1", null);
			insertJob(db, USER_ID, { status: "applied", search_id: search.id });
			insertJob(db, USER_ID, { status: "offer", search_id: search.id });
			const blocking = listBlockingJobs(db, search.id);
			expect(blocking).toHaveLength(1);
			expect(blocking[0]?.status).toBe("applied");
		});

		it("returns an empty array when every job is terminal", () => {
			const search = startNewSearch(db, USER_ID, "Search 1", null);
			insertJob(db, USER_ID, { status: "offer", search_id: search.id });
			insertJob(db, USER_ID, {
				status: "rejected_or_withdrawn",
				search_id: search.id,
			});
			expect(listBlockingJobs(db, search.id)).toStrictEqual([]);
		});

		it("ignores jobs from other rounds", () => {
			const search = startNewSearch(db, USER_ID, "Search 1", null);
			const other = startNewSearch(db, OTHER_USER_ID, "Other's search", null);
			insertJob(db, OTHER_USER_ID, { status: "applied", search_id: other.id });
			expect(listBlockingJobs(db, search.id)).toStrictEqual([]);
		});
	});

	describe("updateSearch", () => {
		it("updates name and notes", () => {
			const search = startNewSearch(db, USER_ID, "Search 1", null);
			const updated = updateSearch(db, search.id, USER_ID, {
				name: "Renamed",
				notes: "updated notes",
			});
			expect(updated?.name).toBe("Renamed");
			expect(updated?.notes).toBe("updated notes");
		});

		it("returns null when the round belongs to a different user", () => {
			const search = startNewSearch(db, OTHER_USER_ID, "Other's search", null);
			expect(
				updateSearch(db, search.id, USER_ID, { name: "Hijacked", notes: null }),
			).toBeNull();
		});

		it("returns null when the round does not exist", () => {
			expect(
				updateSearch(db, 9999, USER_ID, { name: "Nope", notes: null }),
			).toBeNull();
		});
	});
});
