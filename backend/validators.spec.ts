import {
	validateEndingSubstatus,
	validateOfferDate,
	VALID_OFFER_SUBSTATUSES,
	VALID_REJECTED_SUBSTATUSES,
} from "./validators.js";

describe("validateEndingSubstatus", () => {
	describe("offer status", () => {
		it("accepts 'Offer accepted'", () => {
			expect(validateEndingSubstatus("offer", "Offer accepted")).toBeNull();
		});

		it("accepts 'Offer declined'", () => {
			expect(validateEndingSubstatus("offer", "Offer declined")).toBeNull();
		});

		it("rejects null for offer (substatus is required)", () => {
			expect(validateEndingSubstatus("offer", null)).not.toBeNull();
		});

		it("rejects a rejection substatus for offer", () => {
			expect(validateEndingSubstatus("offer", "Ghosted")).not.toBeNull();
		});

		it("rejects every rejection substatus for offer", () => {
			for (const s of VALID_REJECTED_SUBSTATUSES) {
				expect(validateEndingSubstatus("offer", s)).not.toBeNull();
			}
		});

		it("returns an error mentioning the valid offer values", () => {
			const err = validateEndingSubstatus("offer", null);
			expect(err).toMatch(/Offer accepted/);
			expect(err).toMatch(/Offer declined/);
		});
	});

	describe("rejected_or_withdrawn status", () => {
		it.each([...VALID_REJECTED_SUBSTATUSES])("accepts '%s'", (substatus) => {
			expect(
				validateEndingSubstatus("rejected_or_withdrawn", substatus),
			).toBeNull();
		});

		it("rejects null for rejected_or_withdrawn (substatus is required)", () => {
			expect(
				validateEndingSubstatus("rejected_or_withdrawn", null),
			).not.toBeNull();
		});

		it("rejects 'Offer accepted' for rejected_or_withdrawn", () => {
			expect(
				validateEndingSubstatus("rejected_or_withdrawn", "Offer accepted"),
			).not.toBeNull();
		});

		it("rejects every offer substatus for rejected_or_withdrawn", () => {
			for (const s of VALID_OFFER_SUBSTATUSES) {
				expect(
					validateEndingSubstatus("rejected_or_withdrawn", s),
				).not.toBeNull();
			}
		});

		it("returns an error that does not mention offer substatuses", () => {
			const err = validateEndingSubstatus("rejected_or_withdrawn", null);
			expect(err).not.toMatch(/Offer accepted/);
			expect(err).not.toMatch(/Offer declined/);
		});
	});

	describe("non-terminal statuses", () => {
		const ACTIVE_STATUSES = [
			"not_started",
			"applied",
			"phone_screen",
			"interviewing",
		];

		it.each(
			ACTIVE_STATUSES,
		)("accepts null for active status '%s'", (status) => {
			expect(validateEndingSubstatus(status, null)).toBeNull();
		});

		it.each(
			ACTIVE_STATUSES,
		)("rejects a substatus value for active status '%s'", (status) => {
			expect(validateEndingSubstatus(status, "Withdrawn")).not.toBeNull();
		});
	});
});

describe("validateOfferDate", () => {
	describe("offer status", () => {
		it("accepts a valid date string", () => {
			expect(validateOfferDate("offer", "2026-05-15")).toBeNull();
		});

		it("rejects null for offer (date is required)", () => {
			expect(validateOfferDate("offer", null)).not.toBeNull();
		});

		it("rejects empty string for offer", () => {
			expect(validateOfferDate("offer", "")).not.toBeNull();
		});

		it("returns an error mentioning date_offer_extended", () => {
			const err = validateOfferDate("offer", null);
			expect(err).toMatch(/date_offer_extended/);
		});
	});

	describe("non-offer statuses", () => {
		const NON_OFFER_STATUSES = [
			"not_started",
			"applied",
			"phone_screen",
			"interviewing",
			"rejected_or_withdrawn",
		];

		it.each(NON_OFFER_STATUSES)("accepts null for status '%s'", (status) => {
			expect(validateOfferDate(status, null)).toBeNull();
		});

		it.each(
			NON_OFFER_STATUSES,
		)("rejects a non-null date for status '%s'", (status) => {
			expect(validateOfferDate(status, "2026-05-15")).not.toBeNull();
		});
	});
});
