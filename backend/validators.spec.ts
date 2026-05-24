import {
	validateEndingSubstatus,
	validateOfferDate,
	VALID_OFFER_SUBSTATUSES,
	VALID_REJECTED_SUBSTATUSES,
} from "./validators.js";

describe(validateEndingSubstatus, () => {
	describe("Offer! status", () => {
		it("accepts 'Offer accepted'", () => {
			expect(validateEndingSubstatus("Offer!", "Offer accepted")).toBeNull();
		});

		it("accepts 'Offer declined'", () => {
			expect(validateEndingSubstatus("Offer!", "Offer declined")).toBeNull();
		});

		it("rejects null for Offer! (substatus is required)", () => {
			expect(validateEndingSubstatus("Offer!", null)).not.toBeNull();
		});

		it("rejects a rejection substatus for Offer!", () => {
			expect(validateEndingSubstatus("Offer!", "Ghosted")).not.toBeNull();
		});

		it("rejects every rejection substatus for Offer!", () => {
			for (const s of VALID_REJECTED_SUBSTATUSES) {
				expect(validateEndingSubstatus("Offer!", s)).not.toBeNull();
			}
		});

		it("returns an error mentioning the valid offer values", () => {
			const err = validateEndingSubstatus("Offer!", null);
			expect(err).toMatch(/Offer accepted/);
			expect(err).toMatch(/Offer declined/);
		});
	});

	describe("Rejected/Withdrawn status", () => {
		it.each([...VALID_REJECTED_SUBSTATUSES])("accepts '%s'", (substatus) => {
			expect(
				validateEndingSubstatus("Rejected/Withdrawn", substatus),
			).toBeNull();
		});

		it("rejects null for Rejected/Withdrawn (substatus is required)", () => {
			expect(
				validateEndingSubstatus("Rejected/Withdrawn", null),
			).not.toBeNull();
		});

		it("rejects 'Offer accepted' for Rejected/Withdrawn", () => {
			expect(
				validateEndingSubstatus("Rejected/Withdrawn", "Offer accepted"),
			).not.toBeNull();
		});

		it("rejects every offer substatus for Rejected/Withdrawn", () => {
			for (const s of VALID_OFFER_SUBSTATUSES) {
				expect(validateEndingSubstatus("Rejected/Withdrawn", s)).not.toBeNull();
			}
		});

		it("returns an error that does not mention offer substatuses", () => {
			const err = validateEndingSubstatus("Rejected/Withdrawn", null);
			expect(err).not.toMatch(/Offer accepted/);
			expect(err).not.toMatch(/Offer declined/);
		});
	});

	describe("non-terminal statuses", () => {
		const ACTIVE_STATUSES = [
			"Not started",
			"Applied",
			"Phone screen",
			"Interviewing",
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

describe(validateOfferDate, () => {
	describe("Offer! status", () => {
		it("accepts a valid date string", () => {
			expect(validateOfferDate("Offer!", "2026-05-15")).toBeNull();
		});

		it("rejects null for Offer! (date is required)", () => {
			expect(validateOfferDate("Offer!", null)).not.toBeNull();
		});

		it("rejects empty string for Offer!", () => {
			expect(validateOfferDate("Offer!", "")).not.toBeNull();
		});

		it("returns an error mentioning date_offer_extended", () => {
			const err = validateOfferDate("Offer!", null);
			expect(err).toMatch(/date_offer_extended/);
		});
	});

	describe("non-Offer! statuses", () => {
		const NON_OFFER_STATUSES = [
			"Not started",
			"Applied",
			"Phone screen",
			"Interviewing",
			"Rejected/Withdrawn",
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
