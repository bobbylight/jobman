import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";
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
	referred_by: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
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

		fireEvent.change(screen.getByPlaceholderText(/Search by company or role/), {
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

		fireEvent.change(screen.getByPlaceholderText(/Search by company or role/), {
			target: { value: "frontend" },
		});

		expect(screen.getByText("Acme")).toBeInTheDocument();
		expect(screen.queryByText("Beta")).not.toBeInTheDocument();
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
