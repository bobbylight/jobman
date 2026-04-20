import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppShell from "./AppShell";
import JobManagementPage from "./JobManagementPage";
import StatsPage from "./StatsPage";
import KanbanBoard from "./KanbanBoard";
import { api } from "../api";
import type { Job, User } from "../types";

vi.mock(
	import("../api"),
	() =>
		({
			api: {
				createJob: vi.fn(),
				deleteJob: vi.fn(),
				getInterviews: vi.fn(),
				getJob: vi.fn(),
				getJobs: vi.fn(),
				getQuestions: vi.fn(),
				getStats: vi.fn(),
				updateJob: vi.fn(),
			},
		}) as any,
);

vi.mock(import("./KanbanBoard"), () => ({ default: vi.fn() }) as any);
vi.mock(
	import("./CompanyLogo"),
	() =>
		({
			default: ({ company }: { company: string }) => (
				<span
					data-testid="company-logo"
					data-company={company}
					aria-hidden="true"
				/>
			),
		}) as any,
);
vi.mock(
	import("./StatsPage"),
	() =>
		({
			default: vi.fn(() => <div data-testid="stats-page" />),
		}) as any,
);

vi.mock(
	import("@dnd-kit/core"),
	() =>
		({
			DndContext: ({ children }: { children: React.ReactNode }) => (
				<>{children}</>
			),
			DragOverlay: () => null,
			pointerWithin: () => [],
			useDraggable: () => ({
				attributes: {},
				listeners: {},
				setNodeRef: () => {},
				transform: null,
				isDragging: false,
			}),
			useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
		}) as any,
);

vi.mock(
	import("@dnd-kit/utilities"),
	() =>
		({
			CSS: { Translate: { toString: () => "" } },
		}) as any,
);

const mockGetJobs = vi.mocked(api.getJobs);
const mockGetJob = vi.mocked(api.getJob);
const MockKanbanBoard = vi.mocked(KanbanBoard);

const MOCK_USER: User = {
	avatarUrl: "https://example.com/avatar.jpg",
	displayName: "Test User",
	email: "test@example.com",
	id: 1,
};

const MOCK_ON_LOGOUT = vi.fn();

const makeJob = (overrides: Partial<Job> & Pick<Job, "id">): Job => ({
	company: "Acme",
	created_at: "2024-01-01T00:00:00.000Z",
	date_applied: null,
	date_last_onsite: null,
	date_phone_screen: null,
	ending_substatus: null,
	favorite: false,
	fit_score: null,
	job_description: null,
	link: "https://acme.com",
	notes: null,
	recruiter: null,
	referred_by: null,
	role: "Engineer",
	salary: null,
	status: "Not started",
	tags: [],
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

describe(JobManagementPage, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.getInterviews).mockResolvedValue([]);
		vi.mocked(api.getQuestions).mockResolvedValue([]);
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
			makeJob({ company: "TechCorp", id: 1, role: "Dev" }),
		]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("TechCorp")).toBeInTheDocument();
		});
	});

	it("filters jobs by company name when searching", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ company: "TechCorp", id: 1, role: "Dev" }),
			makeJob({ company: "HealthCo", id: 2, role: "PM" }),
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
			makeJob({ company: "Acme", id: 1, role: "Frontend Engineer" }),
			makeJob({ company: "Beta", id: 2, role: "Product Manager" }),
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

	it("filters jobs to favorites only when the Favorites button is toggled", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ company: "Starred Co", favorite: true, id: 1 }),
			makeJob({ company: "Plain Co", favorite: false, id: 2 }),
		]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Starred Co")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Favorites only" }));

		expect(screen.getByText("Starred Co")).toBeInTheDocument();
		expect(screen.queryByText("Plain Co")).not.toBeInTheDocument();
	});

	it("hides withdrawn jobs by default but keeps rejections visible", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({
				company: "Withdrawn Co",
				ending_substatus: "Withdrawn",
				id: 1,
				status: "Rejected/Withdrawn",
			}),
			makeJob({
				company: "Rejected Co",
				ending_substatus: "Rejected",
				id: 2,
				status: "Rejected/Withdrawn",
			}),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		// Withdrawn hidden by default; rejections visible
		expect(screen.queryByText("Withdrawn Co")).not.toBeInTheDocument();
		expect(screen.getByText("Rejected Co")).toBeInTheDocument();

		// Disable hide-withdrawn via the Filters popover
		fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
		fireEvent.click(screen.getByText("Hide withdrawn/bad fits"));

		expect(screen.getByText("Withdrawn Co")).toBeInTheDocument();
		expect(screen.getByText("Rejected Co")).toBeInTheDocument();
	});

	it("filters jobs by minimum fit score", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ company: "High Co", fit_score: "High", id: 1 }),
			makeJob({ company: "Low Co", fit_score: "Low", id: 2 }),
			makeJob({ company: "Unsure Co", fit_score: null, id: 3 }),
		]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("High Co")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(
			await screen.findByRole("option", { name: "High or better" }),
		);

		expect(screen.getByText("High Co")).toBeInTheDocument();
		expect(screen.queryByText("Low Co")).not.toBeInTheDocument();
		expect(screen.queryByText("Unsure Co")).not.toBeInTheDocument();
	});

	it("shows a Clear filters button in the Filters popover and resets filters on click", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({
				company: "Withdrawn Co",
				ending_substatus: "Withdrawn",
				id: 1,
				status: "Rejected/Withdrawn",
			}),
			makeJob({ company: "Normal Co", id: 2 }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		// Withdrawn Co hidden because hideWithdrawn defaults to true
		expect(screen.queryByText("Withdrawn Co")).not.toBeInTheDocument();

		// Open popover — Clear filters visible (activeFilterCount = 1)
		fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
		expect(
			screen.getByRole("button", { name: /Clear filters/ }),
		).toBeInTheDocument();

		// Click Clear — resets hideWithdrawn to false
		fireEvent.click(screen.getByRole("button", { name: /Clear filters/ }));

		// Clear button gone (activeFilterCount = 0); Withdrawn Co now visible
		expect(
			screen.queryByRole("button", { name: /Clear filters/ }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Withdrawn Co")).toBeInTheDocument();
	});

	it("filters jobs by tag — shows only jobs with at least one selected tag", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ company: "Remote Co", id: 1, tags: ["remote"] }),
			makeJob({ company: "FAANG Co", id: 2, tags: ["faang"] }),
			makeJob({ company: "No Tag Co", id: 3, tags: [] }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
		fireEvent.click(screen.getByRole("button", { name: "Remote" }));

		expect(screen.getByText("Remote Co")).toBeInTheDocument();
		expect(screen.queryByText("FAANG Co")).not.toBeInTheDocument();
		expect(screen.queryByText("No Tag Co")).not.toBeInTheDocument();
	});

	it("tag filter uses OR logic — shows jobs matching any selected tag", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ company: "Remote Co", id: 1, tags: ["remote"] }),
			makeJob({ company: "FAANG Co", id: 2, tags: ["faang"] }),
			makeJob({ company: "No Tag Co", id: 3, tags: [] }),
		]);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);

		fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
		fireEvent.click(screen.getByRole("button", { name: "Remote" }));
		fireEvent.click(screen.getByRole("button", { name: "FAANG" }));

		expect(screen.getByText("Remote Co")).toBeInTheDocument();
		expect(screen.getByText("FAANG Co")).toBeInTheDocument();
		expect(screen.queryByText("No Tag Co")).not.toBeInTheDocument();
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
			const job = makeJob({ company: "DeepLink Co", id: 42 });
			mockGetJobs.mockResolvedValue([job]);
			mockGetJob.mockResolvedValue(job);

			renderPage("/jobs/42");

			await waitFor(() =>
				expect(
					screen.getByRole("heading", { name: "DeepLink Co - Engineer" }),
				).toBeInTheDocument(),
			);
		});

		it("redirects to /jobs when the jobId in the URL does not exist", async () => {
			mockGetJobs.mockResolvedValue([makeJob({ company: "Acme", id: 1 })]);

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
				ending_substatus: "Rejected",
				id: 1,
				status: "Rejected/Withdrawn",
			});
			mockGetJobs.mockResolvedValue([job]);
			vi.mocked(api.updateJob).mockResolvedValue({
				...job,
				ending_substatus: null,
				status: "Applied",
			});

			renderPage();
			await waitFor(() => expect(MockKanbanBoard).toHaveBeenCalled());

			const [{ onStatusChange }] = MockKanbanBoard.mock.lastCall!;
			onStatusChange(job, "Applied");

			await waitFor(() => {
				expect(vi.mocked(api.updateJob)).toHaveBeenCalledWith(
					1,
					expect.objectContaining({
						ending_substatus: null,
						status: "Applied",
					}),
				);
			});
		});
	});

	describe("stats view", () => {
		it("shows the stats page and hides the board when the Insights button is clicked", async () => {
			mockGetJobs.mockResolvedValue([makeJob({ company: "Acme", id: 1 })]);
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

	describe("summary view state management", () => {
		it("calls getJobs on mount to load jobs", async () => {
			mockGetJobs.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);
			expect(mockGetJobs).toHaveBeenCalledOnce();
		});

		it("strips notes and job_description from state after a status change", async () => {
			const job = makeJob({ company: "Acme", id: 1 });
			mockGetJobs.mockResolvedValue([job]);
			// API returns a full job (with notes) after the status change PUT
			vi.mocked(api.updateJob).mockResolvedValue(
				makeJob({
					company: "Acme",
					id: 1,
					job_description: "secret jd",
					notes: "secret",
				}),
			);

			let boardJobs: Job[] = [];
			MockKanbanBoard.mockImplementation(({ jobs, onStatusChange }) => {
				boardJobs = jobs;
				return (
					<button onClick={() => onStatusChange(jobs[0]!, "Phone screen")}>
						change status
					</button>
				);
			});

			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);

			fireEvent.click(screen.getByRole("button", { name: "change status" }));

			await waitFor(() => expect(vi.mocked(api.updateJob)).toHaveBeenCalled());

			// State should not carry notes/job_description — board only needs summary fields
			expect(boardJobs[0]).not.toHaveProperty("notes");
			expect(boardJobs[0]).not.toHaveProperty("job_description");
		});
	});
});
