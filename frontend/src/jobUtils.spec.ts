import { formatTime, isPossiblyGhosted } from "./jobUtils";
import type { Job } from "./types";

// 2026-01-31 — all "old" dates in these tests are Jan 1 (30 days prior, not ghosted)
// Or Dec 31 (31 days prior, ghosted). Recent dates use Feb 1 (future = 0 days ago).
const NOW = new Date("2026-01-31T00:00:00.000Z").getTime();

const BASE_JOB: Job = {
	id: 1,
	company: "Acme",
	role: "Engineer",
	link: "https://example.com",
	status: "Applied",
	fit_score: null,
	salary: null,
	date_applied: null,
	date_phone_screen: null,
	date_last_onsite: null,
	referred_by: null,
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: null,
	favorite: false,
	tags: [],
	created_at: "2025-01-01T00:00:00.000Z",
	updated_at: "2025-01-01T00:00:00.000Z",
};

describe(isPossiblyGhosted, () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns false for 'Not started' regardless of dates", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Not started",
				date_applied: "2024-12-31",
			}),
		).toBeFalsy();
	});

	it("returns false for 'Offer!' regardless of dates", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Offer!",
				date_applied: "2024-12-31",
			}),
		).toBeFalsy();
	});

	it("returns false for 'Rejected/Withdrawn' regardless of dates", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Rejected/Withdrawn",
				date_applied: "2024-12-31",
			}),
		).toBeFalsy();
	});

	it("returns false when all dates are null (no data)", () => {
		expect(isPossiblyGhosted({ ...BASE_JOB, status: "Applied" })).toBeFalsy();
	});

	it("returns true for Applied when date_applied is 31 days ago", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Applied",
				date_applied: "2024-12-31",
			}),
		).toBeTruthy();
	});

	it("returns false for Applied when date_applied is exactly 30 days ago", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Applied",
				date_applied: "2026-01-01",
			}),
		).toBeFalsy();
	});

	it("returns true for 'Phone screen' when date_phone_screen is 31 days ago", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Phone screen",
				date_phone_screen: "2024-12-31",
			}),
		).toBeTruthy();
	});

	it("returns true for Interviewing when date_last_onsite is 31 days ago", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Interviewing",
				date_last_onsite: "2024-12-31",
			}),
		).toBeTruthy();
	});

	it("uses the most recent date when multiple dates are set", () => {
		// Date_applied is old but date_phone_screen is recent — not ghosted
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Phone screen",
				date_applied: "2024-12-31",
				date_phone_screen: "2026-01-20",
			}),
		).toBeFalsy();
	});

	it("returns true when all dates are old, using the most recent one", () => {
		expect(
			isPossiblyGhosted({
				...BASE_JOB,
				status: "Interviewing",
				date_applied: "2024-11-01",
				date_phone_screen: "2024-11-15",
				date_last_onsite: "2024-12-31",
			}),
		).toBeTruthy();
	});
});

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
