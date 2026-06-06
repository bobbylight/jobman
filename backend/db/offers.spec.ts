import Database from "better-sqlite3";
import {
	getOffer,
	createOffer,
	updateOffer,
	deleteOffer,
	getOffersWithJobs,
	type OfferCreateData,
} from "./offers.js";
import { applySchema } from "../db.js";

const BASE_OFFER: Omit<OfferCreateData, "job_id"> = {
	base_pay_amount: 150_000,
	target_bonus_percent: 15,
	equity_amount: 400_000,
	equity_vesting_years: 4,
	equity_type: "rsus",
	signing_bonus_amount: 20_000,
	wellness_stipend_amount: 1200,
	other_amount: null,
	other_label: null,
	other_is_recurring: false,
	k401_match_percent: 4,
	offer_deadline: "2026-07-01",
	notes: "Great package",
};

function makeDb() {
	const db = new Database(":memory:");
	applySchema(db);
	return db;
}

describe("offers db", () => {
	let db: Database.Database;
	let jobId: number;
	const USER_ID = 1;

	beforeEach(() => {
		db = makeDb();
		db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(USER_ID, "user@example.com");
		const result = db
			.prepare("INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)")
			.run(USER_ID, "Acme", "Engineer", "https://example.com", "offer");
		jobId = Number(result.lastInsertRowid);
	});

	describe("getOffer", () => {
		it("returns undefined when no offer exists", () => {
			expect(getOffer(db, jobId)).toBeUndefined();
		});

		it("returns the offer when it exists", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			const offer = getOffer(db, jobId);
			expect(offer).toBeDefined();
			expect(offer!.job_id).toBe(jobId);
			expect(offer!.base_pay_amount).toBe(150_000);
		});

		it("coalesces null equity_vesting_years to 4", () => {
			db.prepare("INSERT INTO offers (job_id, equity_vesting_years) VALUES (?, NULL)").run(jobId);
			const offer = getOffer(db, jobId);
			expect(offer!.equity_vesting_years).toBe(4);
		});

		it("returns other_is_recurring as a boolean", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId, other_is_recurring: true });
			const offer = getOffer(db, jobId);
			expect(offer!.other_is_recurring).toBeTruthy();
		});
	});

	describe("createOffer", () => {
		it("inserts and returns the full offer row", () => {
			const offer = createOffer(db, { ...BASE_OFFER, job_id: jobId });
			expect(offer.id).toBeTypeOf("number");
			expect(offer.job_id).toBe(jobId);
			expect(offer.base_pay_amount).toBe(150_000);
			expect(offer.equity_type).toBe("rsus");
			expect(offer.other_is_recurring).toBeFalsy();
		});

		it("stores other_is_recurring=true as 1 and returns as boolean true", () => {
			const offer = createOffer(db, { ...BASE_OFFER, job_id: jobId, other_is_recurring: true });
			expect(offer.other_is_recurring).toBeTruthy();
		});

		it("defaults equity_vesting_years to 4 when null", () => {
			const offer = createOffer(db, { ...BASE_OFFER, job_id: jobId, equity_vesting_years: null });
			expect(offer.equity_vesting_years).toBe(4);
		});
	});

	describe("updateOffer", () => {
		it("replaces all fields and returns updated offer", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			const updated = updateOffer(db, jobId, {
				...BASE_OFFER,
				base_pay_amount: 200_000,
				notes: "Updated notes",
			});
			expect(updated).toBeDefined();
			expect(updated!.base_pay_amount).toBe(200_000);
			expect(updated!.notes).toBe("Updated notes");
		});

		it("can null out fields", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			const updated = updateOffer(db, jobId, {
				...BASE_OFFER,
				base_pay_amount: null,
				signing_bonus_amount: null,
			});
			expect(updated!.base_pay_amount).toBeNull();
			expect(updated!.signing_bonus_amount).toBeNull();
		});

		it("returns null when no offer exists for the job", () => {
			const result = updateOffer(db, jobId, BASE_OFFER);
			expect(result).toBeNull();
		});
	});

	describe("deleteOffer", () => {
		it("deletes the offer and returns true", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			expect(deleteOffer(db, jobId)).toBeTruthy();
			expect(getOffer(db, jobId)).toBeUndefined();
		});

		it("returns false when no offer exists", () => {
			expect(deleteOffer(db, jobId)).toBeFalsy();
		});
	});

	describe("getOffersWithJobs", () => {
		it("returns only jobs with offer status", () => {
			db.prepare("INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)")
				.run(USER_ID, "Other Co", "PM", "https://other.com", "applied");
			createOffer(db, { ...BASE_OFFER, job_id: jobId });

			const results = getOffersWithJobs(db, USER_ID);
			expect(results).toHaveLength(1);
			const [first] = results;
			expect(first!.job).toMatchObject({ id: jobId, company: "Acme" });
		});

		it("includes offer as null when job has no offer", () => {
			const results = getOffersWithJobs(db, USER_ID);
			expect(results).toHaveLength(1);
			const [first] = results;
			expect(first!.offer).toBeNull();
		});

		it("includes offer data when job has an offer", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			const results = getOffersWithJobs(db, USER_ID);
			const [first] = results;
			expect(first!.offer).toBeDefined();
			expect((first!.offer as { base_pay_amount: number }).base_pay_amount).toBe(150_000);
		});

		it("only returns jobs belonging to the requesting user", () => {
			db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(2, "other@example.com");
			db.prepare("INSERT INTO jobs (user_id, company, role, link, status) VALUES (?, ?, ?, ?, ?)")
				.run(2, "Other Co", "PM", "https://other.com", "offer");

			const results = getOffersWithJobs(db, USER_ID);
			expect(results).toHaveLength(1);
			const [first] = results;
			expect(first!.job).toMatchObject({ company: "Acme" });
		});

		it("coalesces null equity_vesting_years to 4 in offer", () => {
			db.prepare("INSERT INTO offers (job_id, equity_vesting_years) VALUES (?, NULL)").run(jobId);
			const results = getOffersWithJobs(db, USER_ID);
			const [first] = results;
			expect((first!.offer as { equity_vesting_years: number }).equity_vesting_years).toBe(4);
		});

		it("returns other_is_recurring as a boolean in offer", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId, other_is_recurring: true });
			const results = getOffersWithJobs(db, USER_ID);
			const [first] = results;
			expect((first!.offer as { other_is_recurring: boolean }).other_is_recurring).toBeTruthy();
		});

		it("returns has_offer=true on the job when an offer exists", () => {
			createOffer(db, { ...BASE_OFFER, job_id: jobId });
			const results = getOffersWithJobs(db, USER_ID);
			const [first] = results;
			expect((first!.job as { has_offer: boolean }).has_offer).toBeTruthy();
		});

		it("returns has_offer=false on the job when no offer exists", () => {
			const results = getOffersWithJobs(db, USER_ID);
			const [first] = results;
			expect((first!.job as { has_offer: boolean }).has_offer).toBeFalsy();
		});
	});
});
