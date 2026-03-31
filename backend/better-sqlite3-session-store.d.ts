declare module "better-sqlite3-session-store" {
	import type session from "express-session";
	import type Database from "better-sqlite3";

	function factory(
		session: typeof session,
	): new (options: {
		client: Database.Database;
	}) => session.Store;

	export = factory;
}
