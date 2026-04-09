import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InterviewsPage, { getDefaultDateRange } from "./InterviewsPage";
import { api } from "../api";
import type { EnrichedInterview } from "../types";

vi.mock("../api", () => ({
	api: { searchInterviews: vi.fn(), loadMoreInterviews: vi.fn() },
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return { ...actual, useNavigate: () => mockNavigate };
});

const mockSearchInterviews = vi.mocked(api.searchInterviews);
const mockLoadMoreInterviews = vi.mocked(api.loadMoreInterviews);

// Fix "today" to Wednesday Apr 8, 2026 for deterministic date math.
// Next Sunday = Apr 12, Sunday after that = Apr 19.
const FIXED_NOW = new Date("2026-04-08T12:00:00Z").getTime();
const DEFAULT_FROM = "2026-04-08";
const DEFAULT_TO = "2026-04-19";

function makeInterview(
	overrides: Partial<EnrichedInterview> = {},
): EnrichedInterview {
	return {
		id: 1,
		job_id: 10,
		interview_stage: "phone_screen",
		interview_dttm: "2026-03-15T14:00:00Z",
		interview_interviewers: null,
		interview_type: null,
		interview_vibe: null,
		interview_notes: null,
		job: {
			id: 10,
			company: "Acme Corp",
			role: "Software Engineer",
			link: "https://example.com/job",
		},
		...overrides,
	};
}

function renderPage() {
	return render(
		<MemoryRouter>
			<InterviewsPage />
		</MemoryRouter>,
	);
}

describe("getDefaultDateRange", () => {
	beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
	afterEach(() => vi.useRealTimers());

	it("returns today as 'from' on a Wednesday", () => {
		vi.setSystemTime(FIXED_NOW);
		const { from } = getDefaultDateRange();
		expect(from).toBe(DEFAULT_FROM);
	});

	it("returns the Sunday after next Sunday as 'to' on a Wednesday", () => {
		vi.setSystemTime(FIXED_NOW);
		const { to } = getDefaultDateRange();
		expect(to).toBe(DEFAULT_TO); // next Sun Apr 12, then +7 = Apr 19
	});

	it("adds a full 14 days when today is Sunday", () => {
		// Apr 12, 2026 is a Sunday
		vi.setSystemTime(new Date("2026-04-12T12:00:00Z").getTime());
		const { from, to } = getDefaultDateRange();
		expect(from).toBe("2026-04-12");
		expect(to).toBe("2026-04-26"); // +7 = Apr 19, +7 = Apr 26
	});

	it("includes only tomorrow through 8 days when today is Saturday", () => {
		// Apr 11, 2026 is a Saturday
		vi.setSystemTime(new Date("2026-04-11T12:00:00Z").getTime());
		const { from, to } = getDefaultDateRange();
		expect(from).toBe("2026-04-11");
		expect(to).toBe("2026-04-19"); // next Sun Apr 12, +7 = Apr 19
	});
});

describe("InterviewsPage", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(FIXED_NOW);
		vi.clearAllMocks();
	});
	afterEach(() => vi.useRealTimers());

	it("shows a loading spinner while fetching", () => {
		mockSearchInterviews.mockReturnValue(new Promise(() => {}));
		renderPage();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner after data loads", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
	});

	it("shows an error message when the fetch fails", async () => {
		mockSearchInterviews.mockRejectedValue(new Error("Network error"));
		renderPage();
		await waitFor(() =>
			expect(screen.getByText(/Failed to load interviews/)).toBeInTheDocument(),
		);
	});

	it("shows empty week buckets with 'No interviews this week' when default range has no results", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Remaining this week (0):")).toBeInTheDocument(),
		);
		expect(screen.getByText("Next week (0):")).toBeInTheDocument();
		expect(screen.getAllByText("No interviews this week")).toHaveLength(2);
	});

	it("shows 'No interviews found in this date range' when range excludes current and next week", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		// Set range entirely in the past (before today)
		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-01-31" },
		});

		await waitFor(() =>
			expect(
				screen.getByText(/No interviews found in this date range/),
			).toBeInTheDocument(),
		);
	});

	it("calls searchInterviews with the default date range on initial render", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(mockSearchInterviews).toHaveBeenCalledWith(
				DEFAULT_FROM,
				DEFAULT_TO,
			),
		);
	});

	it("pre-populates From and To inputs with default values", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
		expect(screen.getByLabelText<HTMLInputElement>("From").value).toBe(
			DEFAULT_FROM,
		);
		expect(screen.getByLabelText<HTMLInputElement>("To").value).toBe(
			DEFAULT_TO,
		);
	});

	it("re-fetches with new from param when From date is changed", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() => expect(mockSearchInterviews).toHaveBeenCalledTimes(1));

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
		});

		await waitFor(() =>
			expect(mockSearchInterviews).toHaveBeenLastCalledWith(
				"2026-01-01",
				DEFAULT_TO,
			),
		);
	});

	it("re-fetches with new to param when To date is changed", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() => expect(mockSearchInterviews).toHaveBeenCalledTimes(1));

		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-12-31" },
		});

		await waitFor(() =>
			expect(mockSearchInterviews).toHaveBeenLastCalledWith(
				DEFAULT_FROM,
				"2026-12-31",
			),
		);
	});

	it("renders interview type and date after data loads", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Phone Screen")).toBeInTheDocument(),
		);
	});

	it("renders the job company and role as a link", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByText(/Acme Corp.*Software Engineer/),
			).toBeInTheDocument(),
		);
	});

	it("renders the vibe chip when present", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ interview_vibe: "casual" }),
		]);
		renderPage();
		await waitFor(() => expect(screen.getByText("Casual")).toBeInTheDocument());
	});

	it("renders interviewers when present", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ interview_interviewers: "Jane Smith, Bob Lee" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Jane Smith, Bob Lee")).toBeInTheDocument(),
		);
	});

	it("renders first line of notes when present", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ interview_notes: "First line\nSecond line" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("First line")).toBeInTheDocument(),
		);
		expect(screen.queryByText("Second line")).not.toBeInTheDocument();
	});

	it("navigates to job page when company/role link is clicked", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByText(/Acme Corp.*Software Engineer/),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByText(/Acme Corp.*Software Engineer/));
		expect(mockNavigate).toHaveBeenCalledWith("/jobs/10");
	});

	// FIXED_NOW = Wed Apr 8, 2026; DEFAULT_FROM = "2026-04-08"; DEFAULT_TO = "2026-04-19"
	// This week: Apr 6 (Mon) – Apr 12 (Sun)  → "Remaining this week (n):"
	// Next week: Apr 13 (Mon) – Apr 19 (Sun)  → "Next week (n):"
	// Future:    Apr 20 (Mon)+                → "Future (n):"
	// Past:      before Apr 8 midnight        → "Past interviews (n):"

	it("groups interviews into 'Remaining this week' with count", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-09T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Remaining this week (1):")).toBeInTheDocument(),
		);
	});

	it("groups interviews into 'Next week' with count", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-15T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Next week (1):")).toBeInTheDocument(),
		);
	});

	it("groups interviews into 'Future' with count", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-22T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Future (1):")).toBeInTheDocument(),
		);
	});

	it("groups interviews into 'Past interviews' with count", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-05T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Past interviews (1):")).toBeInTheDocument(),
		);
	});

	it("shows multiple week buckets with correct counts", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-05T10:00:00Z" }), // past
			makeInterview({ id: 2, interview_dttm: "2026-04-09T10:00:00Z" }), // this week
			makeInterview({ id: 3, interview_dttm: "2026-04-15T10:00:00Z" }), // next week
			makeInterview({ id: 4, interview_dttm: "2026-04-22T10:00:00Z" }), // future
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Past interviews (1):")).toBeInTheDocument(),
		);
		expect(screen.getByText("Remaining this week (1):")).toBeInTheDocument();
		expect(screen.getByText("Next week (1):")).toBeInTheDocument();
		expect(screen.getByText("Future (1):")).toBeInTheDocument();
	});

	it("always shows 'Remaining this week (0)' and 'No interviews this week' when in range with no interviews", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Remaining this week (0):")).toBeInTheDocument(),
		);
		expect(screen.getByText("Next week (0):")).toBeInTheDocument();
		expect(screen.getAllByText("No interviews this week")).toHaveLength(2);
	});

	it("does not show 'Remaining this week' when date range excludes current week", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
		// Set range entirely in the future beyond next week
		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-04-20" },
		});
		fireEvent.change(screen.getByLabelText("To"), {
			target: { value: "2026-05-31" },
		});
		await waitFor(() =>
			expect(screen.queryByText(/Remaining this week/)).not.toBeInTheDocument(),
		);
		expect(screen.queryByText(/Next week/)).not.toBeInTheDocument();
	});

	it("applies dimmed style to past interview cards and not to upcoming ones", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-05T10:00:00Z" }), // past
			makeInterview({ id: 2, interview_dttm: "2026-04-09T10:00:00Z" }), // this week
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Past interviews (1):")).toBeInTheDocument(),
		);
		const cards = document.querySelectorAll<HTMLElement>(
			'[data-testid="interview-card"]',
		);
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveAttribute("data-dimmed", "true");
		expect(cards[1]).toHaveAttribute("data-dimmed", "false");
	});

	it("shows total count after data loads", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1 }),
			makeInterview({ id: 2 }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("2 interviews")).toBeInTheDocument(),
		);
	});

	it("shows singular 'interview' for count of 1", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("1 interview")).toBeInTheDocument(),
		);
	});

	it("does not show Reset button when filters match defaults", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
		expect(
			screen.queryByRole("button", { name: /Reset/ }),
		).not.toBeInTheDocument();
	});

	it("shows Reset button when From is changed from default", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
		});
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Reset/ })).toBeInTheDocument(),
		);
	});

	it("resets both date filters to defaults when Reset is clicked", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
		});
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Reset/ })).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Reset/ }));

		await waitFor(() =>
			expect(mockSearchInterviews).toHaveBeenLastCalledWith(
				DEFAULT_FROM,
				DEFAULT_TO,
			),
		);
		expect(
			screen.queryByRole("button", { name: /Reset/ }),
		).not.toBeInTheDocument();
	});

	it("renders onsite type label for onsite interviews", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ interview_stage: "onsite" }),
		]);
		renderPage();
		await waitFor(() => expect(screen.getByText("Onsite")).toBeInTheDocument());
	});

	// --- Load More ---

	it("shows Load More button when initial load returns results", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
	});

	it("does not show Load More button when initial load is empty", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
		expect(
			screen.queryByRole("button", { name: /Load More/ }),
		).not.toBeInTheDocument();
	});

	it("shows a spinner in place of Load More while loading more", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		mockLoadMoreInterviews.mockReturnValue(new Promise(() => {}));
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		expect(
			screen.queryByRole("button", { name: /Load More/ }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("appends new interviews and shows success Snackbar on load more", async () => {
		const first = makeInterview({
			id: 1,
			interview_dttm: "2026-04-10T10:00:00Z",
		});
		const second = makeInterview({
			id: 2,
			interview_dttm: "2026-04-20T10:00:00Z",
			job: {
				id: 11,
				company: "Beta Inc",
				role: "Staff SWE",
				link: "https://beta.example.com",
			},
		});
		mockSearchInterviews.mockResolvedValue([first]);
		mockLoadMoreInterviews.mockResolvedValue([second]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(screen.getByText("Beta Inc · Staff SWE")).toBeInTheDocument(),
		);
		expect(screen.getByText("Loaded 1 new interview")).toBeInTheDocument();
	});

	it("advances the 'To' date picker to the last loaded interview's date", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-10T10:00:00Z" }),
		]);
		mockLoadMoreInterviews.mockResolvedValue([
			makeInterview({ id: 2, interview_dttm: "2026-04-28T09:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		const toInput = screen.getByLabelText("To") as HTMLInputElement;
		expect(toInput.value).toBe(DEFAULT_TO);

		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() => expect(toInput.value).toBe("2026-04-28"));
	});

	it("does not re-fetch when 'To' is advanced by Load More", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-04-10T10:00:00Z" }),
		]);
		mockLoadMoreInterviews.mockResolvedValue([
			makeInterview({ id: 2, interview_dttm: "2026-04-28T09:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		const callsBefore = mockSearchInterviews.mock.calls.length;
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe(
				"2026-04-28",
			),
		);
		// searchInterviews must not have been called again
		expect(mockSearchInterviews.mock.calls.length).toBe(callsBefore);
	});

	it("uses plural 'interviews' in Snackbar when loading more than one", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview({ id: 1 })]);
		mockLoadMoreInterviews.mockResolvedValue([
			makeInterview({ id: 2, interview_dttm: "2026-05-01T10:00:00Z" }),
			makeInterview({ id: 3, interview_dttm: "2026-05-02T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(screen.getByText("Loaded 2 new interviews")).toBeInTheDocument(),
		);
	});

	it("shows 'No more scheduled interviews' and hides Load More when response is empty", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		mockLoadMoreInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(
				screen.getByText("No more scheduled interviews"),
			).toBeInTheDocument(),
		);
		expect(
			screen.queryByRole("button", { name: /Load More/ }),
		).not.toBeInTheDocument();
	});

	it("shows 'No more interviews scheduled' Snackbar when response is empty", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		mockLoadMoreInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(
				screen.getByText("No more interviews scheduled"),
			).toBeInTheDocument(),
		);
	});

	it("sets reachedEnd when load more returns fewer results than PAGE_SIZE", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview({ id: 1 })]);
		// 3 results < PAGE_SIZE (10) → should reach end
		mockLoadMoreInterviews.mockResolvedValue([
			makeInterview({ id: 2, interview_dttm: "2026-05-01T10:00:00Z" }),
			makeInterview({ id: 3, interview_dttm: "2026-05-02T10:00:00Z" }),
			makeInterview({ id: 4, interview_dttm: "2026-05-03T10:00:00Z" }),
		]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(
				screen.getByText("No more scheduled interviews"),
			).toBeInTheDocument(),
		);
	});

	it("passes the last interview's dttm as the after cursor", async () => {
		const iv = makeInterview({ interview_dttm: "2026-04-15T14:30:00Z" });
		mockSearchInterviews.mockResolvedValue([iv]);
		mockLoadMoreInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(mockLoadMoreInterviews).toHaveBeenCalledWith(
				"2026-04-15T14:30:00Z",
				10,
			),
		);
	});

	it("re-shows Load More after date filter resets reachedEnd", async () => {
		mockSearchInterviews.mockResolvedValue([makeInterview()]);
		mockLoadMoreInterviews.mockResolvedValue([]);
		renderPage();
		// Reach end
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		fireEvent.click(screen.getByRole("button", { name: /Load More/ }));
		await waitFor(() =>
			expect(
				screen.getByText("No more scheduled interviews"),
			).toBeInTheDocument(),
		);
		// Change filter → resets
		mockSearchInterviews.mockResolvedValue([makeInterview({ id: 99 })]);
		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
		});
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /Load More/ }),
			).toBeInTheDocument(),
		);
		expect(
			screen.queryByText("No more scheduled interviews"),
		).not.toBeInTheDocument();
	});
});
