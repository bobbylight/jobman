import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import InterviewsPage, { getDefaultDateRange } from "./InterviewsPage";
import { api } from "../api";
import type { EnrichedInterview } from "../types";

vi.mock("../api", () => ({
	api: { searchInterviews: vi.fn() },
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return { ...actual, useNavigate: () => mockNavigate };
});

const mockSearchInterviews = vi.mocked(api.searchInterviews);

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
		interview_type: "phone_screen",
		interview_dttm: "2026-03-15T14:00:00Z",
		interview_interviewers: null,
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

	it("shows 'No upcoming interviews' empty state with default filters and no results", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText(/No upcoming interviews/)).toBeInTheDocument(),
		);
	});

	it("shows 'No interviews found in this date range' when filters differ from defaults", async () => {
		mockSearchInterviews.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("From"), {
			target: { value: "2026-01-01" },
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

	it("groups interviews by month", async () => {
		mockSearchInterviews.mockResolvedValue([
			makeInterview({ id: 1, interview_dttm: "2026-03-15T14:00:00Z" }),
			makeInterview({
				id: 2,
				interview_dttm: "2026-04-02T10:00:00Z",
				job: {
					id: 10,
					company: "Beta Inc",
					role: "Staff SWE",
					link: "https://example.com",
				},
			}),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText(/March 2026/i)).toBeInTheDocument(),
		);
		expect(screen.getByText(/April 2026/i)).toBeInTheDocument();
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
			makeInterview({ interview_type: "onsite" }),
		]);
		renderPage();
		await waitFor(() => expect(screen.getByText("Onsite")).toBeInTheDocument());
	});
});
