import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "./AppShell";
import JobManagementPage from "./JobManagementPage";
import StatsPage from "./StatsPage";
import KanbanBoard from "./KanbanBoard";
import { api } from "../api";
import type { Job, User } from "../types";

vi.mock("../api", () => ({
	api: {
		getJobs: vi.fn(),
		createJob: vi.fn(),
		updateJob: vi.fn(),
		deleteJob: vi.fn(),
		getStats: vi.fn(),
	},
}));

vi.mock("./KanbanBoard", () => ({ default: vi.fn() }));
vi.mock("./StatsPage", () => ({
	default: vi.fn(() => <div data-testid="stats-page" />),
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
const MockKanbanBoard = vi.mocked(KanbanBoard);

const MOCK_USER: User = {
	id: 1,
	email: "test@example.com",
	displayName: "Test User",
	avatarUrl: "https://example.com/avatar.jpg",
};

const MOCK_ON_LOGOUT = vi.fn();

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

/** Renders JobManagementPage inside AppShell with the same route structure as App.tsx. */
function renderPage(initialPath = "/jobs", onLogout = MOCK_ON_LOGOUT) {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<Routes>
				<Route
					element={<AppShell currentUser={MOCK_USER} onLogout={onLogout} />}
				>
					<Route path="/jobs" element={<JobManagementPage />} />
					<Route path="/jobs/:jobId" element={<JobManagementPage />} />
					<Route path="/stats" element={<StatsPage />} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe("JobManagementPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		MockKanbanBoard.mockImplementation(({ jobs }) => (
			<>
				{jobs.map((j) => (
					<span key={j.id}>{j.company}</span>
				))}
			</>
		));
	});

	it("shows a loading spinner while jobs are being fetched", () => {
		mockGetJobs.mockReturnValue(new Promise(() => {}));
		renderPage();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner and renders the board after jobs load", async () => {
		mockGetJobs.mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});
		expect(MockKanbanBoard).toHaveBeenCalled();
	});

	it("shows an error snackbar when loading jobs fails", async () => {
		mockGetJobs.mockRejectedValue(new Error("Network error"));
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Failed to load jobs")).toBeInTheDocument();
		});
	});

	it("renders job cards returned from the API", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
		]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("TechCorp")).toBeInTheDocument();
		});
	});

	it("filters jobs by company name when searching", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
			makeJob({ id: 2, company: "HealthCo", role: "PM" }),
		]);
		renderPage();
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
		renderPage();
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
		renderPage();
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
		renderPage();
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
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("High Co")).toBeInTheDocument();
		});

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
		renderPage();
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

	it("focuses the search field when '/' is pressed outside an input", async () => {
		mockGetJobs.mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		const searchInput = screen.getByPlaceholderText(/Search company or role/);
		expect(searchInput).not.toHaveFocus();

		fireEvent.keyDown(document, { key: "/" });

		expect(searchInput).toHaveFocus();
	});

	it("does not steal focus when '/' is pressed inside an input", async () => {
		mockGetJobs.mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		const searchInput = screen.getByPlaceholderText(/Search company or role/);

		const otherInput = document.createElement("input");
		document.body.appendChild(otherInput);
		otherInput.focus();

		fireEvent.keyDown(otherInput, { key: "/" });

		expect(searchInput).not.toHaveFocus();
		document.body.removeChild(otherInput);
	});

	it("opens the add job dialog when 'Add Job' is clicked", async () => {
		mockGetJobs.mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));
		expect(
			screen.getByRole("heading", { name: "Add Job" }),
		).toBeInTheDocument();
	});

	describe("URL-based edit dialog", () => {
		it("opens the edit dialog when navigated to /jobs/:jobId", async () => {
			const job = makeJob({ id: 42, company: "DeepLink Co" });
			mockGetJobs.mockResolvedValue([job]);

			renderPage("/jobs/42");

			await waitFor(() =>
				expect(
					screen.getByRole("heading", { name: "Edit Job" }),
				).toBeInTheDocument(),
			);
		});

		it("redirects to /jobs when the jobId in the URL does not exist", async () => {
			mockGetJobs.mockResolvedValue([makeJob({ id: 1, company: "Acme" })]);

			renderPage("/jobs/999");

			// Dialog should not open; board renders instead
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);
			expect(
				screen.queryByRole("heading", { name: "Edit Job" }),
			).not.toBeInTheDocument();
			expect(screen.getByText("Acme")).toBeInTheDocument();
		});
	});

	describe("status change", () => {
		it("clears ending_substatus when dragging a job to a non-terminal status", async () => {
			const job = makeJob({
				id: 1,
				status: "Rejected/Withdrawn",
				ending_substatus: "Rejected",
			});
			mockGetJobs.mockResolvedValue([job]);
			vi.mocked(api.updateJob).mockResolvedValue({
				...job,
				status: "Resume submitted",
				ending_substatus: null,
			});

			renderPage();
			await waitFor(() => expect(MockKanbanBoard).toHaveBeenCalled());

			const { onStatusChange } = MockKanbanBoard.mock.lastCall![0];
			onStatusChange(job, "Resume submitted");

			await waitFor(() => {
				expect(vi.mocked(api.updateJob)).toHaveBeenCalledWith(
					1,
					expect.objectContaining({
						status: "Resume submitted",
						ending_substatus: null,
					}),
				);
			});
		});
	});

	describe("stats view", () => {
		it("shows the stats page and hides the board when the Insights button is clicked", async () => {
			mockGetJobs.mockResolvedValue([makeJob({ id: 1, company: "Acme" })]);
			renderPage();
			await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument());

			fireEvent.click(screen.getByRole("button", { name: "Stats" }));

			expect(screen.getByTestId("stats-page")).toBeInTheDocument();
			expect(screen.queryByText("Acme")).not.toBeInTheDocument();
		});

		it("hides the filter strip when on the stats view", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);

			expect(
				screen.getByPlaceholderText(/Search company or role/),
			).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Stats" }));

			expect(
				screen.queryByPlaceholderText(/Search company or role/),
			).not.toBeInTheDocument();
		});

		it("hides the Add Job button when on the stats view", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);

			expect(
				screen.getByRole("button", { name: /Add Job/ }),
			).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Stats" }));

			expect(
				screen.queryByRole("button", { name: /Add Job/ }),
			).not.toBeInTheDocument();
		});

		it("returns to the board and shows Add Job when the board icon is clicked", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);

			fireEvent.click(screen.getByRole("button", { name: "Stats" }));
			expect(screen.getByTestId("stats-page")).toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Board" }));
			expect(screen.queryByTestId("stats-page")).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Add Job/ }),
			).toBeInTheDocument();
		});

		it("renders the stats view directly when navigated to /stats", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage("/stats");
			expect(screen.getByTestId("stats-page")).toBeInTheDocument();
			expect(
				screen.queryByPlaceholderText(/Search company or role/),
			).not.toBeInTheDocument();
		});
	});

	describe("user menu", () => {
		it("opens a user menu when the avatar button is clicked", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage();
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: "User menu" }));

			expect(screen.getByText("View Profile")).toBeInTheDocument();
			expect(screen.getByText("Settings")).toBeInTheDocument();
			expect(screen.getByText("Sign Out")).toBeInTheDocument();
		});

		it("calls onLogout when Sign Out is clicked", async () => {
			const mockOnLogout = vi.fn();
			mockGetJobs.mockResolvedValue([]);
			renderPage("/jobs", mockOnLogout);
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: "User menu" }));
			fireEvent.click(screen.getByText("Sign Out"));

			expect(mockOnLogout).toHaveBeenCalledOnce();
		});
	});
});
