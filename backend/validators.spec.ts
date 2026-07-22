import {
	normalizeOptionalUrl,
	validateEndingSubstatus,
	validateOfferDate,
	validateUrlStructure,
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

describe("validateUrlStructure", () => {
	it("accepts a well-formed https URL", () => {
		expect(
			validateUrlStructure(
				"https://docs.google.com/document/d/abc",
				"cover_letter_url",
			),
		).toBeNull();
	});

	it("accepts null (optional field)", () => {
		expect(validateUrlStructure(null, "cover_letter_url")).toBeNull();
	});

	it("accepts undefined (optional field)", () => {
		expect(validateUrlStructure(undefined, "cover_letter_url")).toBeNull();
	});

	it("accepts an empty string (optional field)", () => {
		expect(validateUrlStructure("", "cover_letter_url")).toBeNull();
	});

	it("rejects a malformed string", () => {
		expect(
			validateUrlStructure("not a url", "cover_letter_url"),
		).not.toBeNull();
	});

	it("rejects a non-string value", () => {
		expect(validateUrlStructure(42, "cover_letter_url")).not.toBeNull();
	});

	it("returns an error mentioning the field name", () => {
		const err = validateUrlStructure("not a url", "cover_letter_url");
		expect(err).toMatch(/cover_letter_url/);
	});
});

describe("normalizeOptionalUrl", () => {
	it("trims surrounding whitespace", () => {
		expect(normalizeOptionalUrl("  https://example.com  ")).toBe(
			"https://example.com",
		);
	});

	it("converts an empty string to null", () => {
		expect(normalizeOptionalUrl("")).toBeNull();
	});

	it("converts a whitespace-only string to null", () => {
		expect(normalizeOptionalUrl("   ")).toBeNull();
	});

	it("converts a non-string value to null", () => {
		expect(normalizeOptionalUrl(null)).toBeNull();
		expect(normalizeOptionalUrl(undefined)).toBeNull();
	});

	it("leaves a well-formed URL untouched", () => {
		expect(normalizeOptionalUrl("https://example.com")).toBe(
			"https://example.com",
		);
	});
});
