import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App, { computeDateUpdates } from "./App";
import { api } from "./api";
import type { Job } from "./types";

vi.mock("./api", () => ({
	api: {
		getJobs: vi.fn(),
		createJob: vi.fn(),
		updateJob: vi.fn(),
		deleteJob: vi.fn(),
	},
}));

vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	DragOverlay: () => null,
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: () => {},
		transform: null,
		isDragging: false,
	}),
	useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
	pointerWithin: () => [],
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: { Translate: { toString: () => "" } },
}));

const mockGetJobs = vi.mocked(api.getJobs);

const makeJob = (overrides: Partial<Job> & Pick<Job, "id">): Job => ({
	company: "Acme",
	role: "Engineer",
	link: "https://acme.com",
	status: "Not started",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	job_description: null,
	referred_by: null,
	ending_substatus: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
	...overrides,
});

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows a loading spinner while jobs are being fetched", () => {
		// Never resolves — keeps the spinner visible
		mockGetJobs.mockReturnValue(new Promise(() => {}));
		render(<App />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner and shows the board after jobs load", async () => {
		mockGetJobs.mockResolvedValue([]);
		render(<App />);
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});
		// All 6 status columns should be visible
		expect(screen.getByText("Not started")).toBeInTheDocument();
		expect(screen.getByText("Offer!")).toBeInTheDocument();
	});

	it("shows an error snackbar when loading jobs fails", async () => {
		mockGetJobs.mockRejectedValue(new Error("Network error"));
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("Failed to load jobs")).toBeInTheDocument();
		});
	});

	it("renders job cards returned from the API", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("TechCorp")).toBeInTheDocument();
		});
	});

	it("filters jobs by company name when searching", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
			makeJob({ id: 2, company: "HealthCo", role: "PM" }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("TechCorp")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText(/Search company or role/), {
			target: { value: "tech" },
		});

		expect(screen.getByText("TechCorp")).toBeInTheDocument();
		expect(screen.queryByText("HealthCo")).not.toBeInTheDocument();
	});

	it("filters jobs by role name when searching", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "Acme", role: "Frontend Engineer" }),
			makeJob({ id: 2, company: "Beta", role: "Product Manager" }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("Acme")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText(/Search company or role/), {
			target: { value: "frontend" },
		});

		expect(screen.getByText("Acme")).toBeInTheDocument();
		expect(screen.queryByText("Beta")).not.toBeInTheDocument();
	});

	it("filters jobs to favorites only when the Favorites chip is toggled", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "Starred Co", favorite: true }),
			makeJob({ id: 2, company: "Plain Co", favorite: false }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("Starred Co")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));

		expect(screen.getByText("Starred Co")).toBeInTheDocument();
		expect(screen.queryByText("Plain Co")).not.toBeInTheDocument();
	});

	it("hides withdrawn jobs when Hide Withdrawn is toggled, but keeps rejections", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({
				id: 1,
				company: "Withdrawn Co",
				status: "Rejected/Withdrawn",
				ending_substatus: "Withdrawn",
			}),
			makeJob({
				id: 2,
				company: "Rejected Co",
				status: "Rejected/Withdrawn",
				ending_substatus: "Rejected",
			}),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("Withdrawn Co")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Hide Withdrawn/ }));

		expect(screen.queryByText("Withdrawn Co")).not.toBeInTheDocument();
		expect(screen.getByText("Rejected Co")).toBeInTheDocument();
	});

	it("filters jobs by minimum fit score", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "High Co", fit_score: "High" }),
			makeJob({ id: 2, company: "Low Co", fit_score: "Low" }),
			makeJob({ id: 3, company: "Unsure Co", fit_score: null }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("High Co")).toBeInTheDocument();
		});

		// Open the fit score select and pick "High or better"
		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(
			await screen.findByRole("option", { name: "High or better" }),
		);

		expect(screen.getByText("High Co")).toBeInTheDocument();
		expect(screen.queryByText("Low Co")).not.toBeInTheDocument();
		expect(screen.queryByText("Unsure Co")).not.toBeInTheDocument();
	});

	it("shows the Clear button when any filter is active and resets all filters on click", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "Starred Co", favorite: true }),
			makeJob({ id: 2, company: "Plain Co", favorite: false }),
		]);
		render(<App />);
		await waitFor(() => {
			expect(screen.getByText("Plain Co")).toBeInTheDocument();
		});

		expect(
			screen.queryByRole("button", { name: /Clear/ }),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));
		expect(screen.queryByText("Plain Co")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Clear/ })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
		expect(screen.getByText("Plain Co")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Clear/ }),
		).not.toBeInTheDocument();
	});

	it("opens the add job dialog when 'Add Job' is clicked", async () => {
		mockGetJobs.mockResolvedValue([]);
		render(<App />);
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));
		expect(
			screen.getByRole("heading", { name: "Add Job" }),
		).toBeInTheDocument();
	});
});

describe("computeDateUpdates", () => {
	const NOW = "2026-03-25T14:30";
	const jobWithDates = {
		date_phone_screen: "2026-03-20T10:00",
		date_last_onsite: "2026-03-23T09:00",
	};
	const jobNoDates = { date_phone_screen: null, date_last_onsite: null };

	it("sets date_phone_screen to now and clears date_last_onsite when moving to Initial interview", () => {
		const result = computeDateUpdates(jobWithDates, "Initial interview", NOW);
		expect(result.date_phone_screen).toBe(NOW);
		expect(result.date_last_onsite).toBeNull();
	});

	it("sets date_phone_screen to now when moving to Initial interview from a job with no prior dates", () => {
		const result = computeDateUpdates(jobNoDates, "Initial interview", NOW);
		expect(result.date_phone_screen).toBe(NOW);
		expect(result.date_last_onsite).toBeNull();
	});

	it("sets date_last_onsite to now and preserves date_phone_screen when moving to Final round interview", () => {
		const result = computeDateUpdates(
			jobWithDates,
			"Final round interview",
			NOW,
		);
		expect(result.date_last_onsite).toBe(NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
	});

	it("sets date_last_onsite to now when moving to Final round interview with no prior phone screen", () => {
		const result = computeDateUpdates(jobNoDates, "Final round interview", NOW);
		expect(result.date_last_onsite).toBe(NOW);
		expect(result.date_phone_screen).toBeNull();
	});

	it("clears both dates when moving back to Not started", () => {
		const result = computeDateUpdates(jobWithDates, "Not started", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
	});

	it("clears both dates when moving back to Resume submitted", () => {
		const result = computeDateUpdates(jobWithDates, "Resume submitted", NOW);
		expect(result.date_phone_screen).toBeNull();
		expect(result.date_last_onsite).toBeNull();
	});

	it("preserves both dates when moving to Offer!", () => {
		const result = computeDateUpdates(jobWithDates, "Offer!", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});

	it("preserves both dates when moving to Rejected/Withdrawn", () => {
		const result = computeDateUpdates(jobWithDates, "Rejected/Withdrawn", NOW);
		expect(result.date_phone_screen).toBe(jobWithDates.date_phone_screen);
		expect(result.date_last_onsite).toBe(jobWithDates.date_last_onsite);
	});
});
