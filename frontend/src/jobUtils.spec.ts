import { formatTime } from "./jobUtils";

describe(formatTime, () => {
	beforeEach(() => {
		// No mocks needed; tests use explicit datetime strings
	});

	it("returns a time string for a valid ISO datetime", () => {
		// 2:30 PM
		const result = formatTime("2025-06-15T14:30:00");
		expect(result).toBe("2:30 PM");
	});

	it("returns a time string for midnight", () => {
		const result = formatTime("2025-06-15T00:00:00");
		expect(result).toBe("12:00 AM");
	});

	it("returns a time string for noon", () => {
		const result = formatTime("2025-06-15T12:00:00");
		expect(result).toBe("12:00 PM");
	});

	it("pads minutes correctly for times on the hour", () => {
		const result = formatTime("2025-06-15T09:00:00");
		expect(result).toBe("9:00 AM");
	});

	it("pads minutes correctly for times with single-digit minutes", () => {
		const result = formatTime("2025-06-15T10:05:00");
		expect(result).toBe("10:05 AM");
	});

	it("returns the original string when the input is not a valid date", () => {
		expect(formatTime("not-a-date")).toBe("not-a-date");
	});

	it("returns the original string for an empty string", () => {
		expect(formatTime("")).toBe("");
	});
});
