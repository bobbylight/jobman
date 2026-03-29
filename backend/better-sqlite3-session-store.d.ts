import type { Store } from "express-session";
import type Database from "better-sqlite3";

declare function SqliteStoreFactory(session: {
	Store: typeof Store;
}): new (options: {
	client: Database;
	expired?: { clear?: boolean; intervalMs?: number };
}) => Store;

export = SqliteStoreFactory;
