import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import JobManagementPage from "./JobManagementPage";
import KanbanBoard from "./KanbanBoard";
import { api } from "../api";
import type { Job, User } from "../types";

vi.mock("../api", () => ({
	api: {
		getJobs: vi.fn(),
		createJob: vi.fn(),
		updateJob: vi.fn(),
		deleteJob: vi.fn(),
	},
}));

vi.mock("./KanbanBoard", () => ({ default: vi.fn() }));

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

const DEFAULT_PROPS = {
	currentUser: MOCK_USER,
	onLogout: vi.fn(),
};

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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner and renders the board after jobs load", async () => {
		mockGetJobs.mockResolvedValue([]);
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});
		expect(MockKanbanBoard).toHaveBeenCalled();
	});

	it("shows an error snackbar when loading jobs fails", async () => {
		mockGetJobs.mockRejectedValue(new Error("Network error"));
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		await waitFor(() => {
			expect(screen.getByText("Failed to load jobs")).toBeInTheDocument();
		});
	});

	it("renders job cards returned from the API", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
		]);
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		await waitFor(() => {
			expect(screen.getByText("TechCorp")).toBeInTheDocument();
		});
	});

	it("filters jobs by company name when searching", async () => {
		mockGetJobs.mockResolvedValue([
			makeJob({ id: 1, company: "TechCorp", role: "Dev" }),
			makeJob({ id: 2, company: "HealthCo", role: "PM" }),
		]);
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
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
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		const searchInput = screen.getByPlaceholderText(/Search company or role/);

		// Simulate pressing "/" while focused on some other input
		const otherInput = document.createElement("input");
		document.body.appendChild(otherInput);
		otherInput.focus();

		fireEvent.keyDown(otherInput, { key: "/" });

		expect(searchInput).not.toHaveFocus();
		document.body.removeChild(otherInput);
	});

	it("opens the add job dialog when 'Add Job' is clicked", async () => {
		mockGetJobs.mockResolvedValue([]);
		render(<JobManagementPage {...DEFAULT_PROPS} />);
		await waitFor(() => {
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: /Add Job/ }));
		expect(
			screen.getByRole("heading", { name: "Add Job" }),
		).toBeInTheDocument();
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

			render(<JobManagementPage {...DEFAULT_PROPS} />);
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

	describe("user menu", () => {
		it("opens a user menu when the avatar button is clicked", async () => {
			mockGetJobs.mockResolvedValue([]);
			render(<JobManagementPage {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: "Test User" }));

			expect(screen.getByText("View Profile")).toBeInTheDocument();
			expect(screen.getByText("Settings")).toBeInTheDocument();
			expect(screen.getByText("Sign Out")).toBeInTheDocument();
		});

		it("calls onLogout when Sign Out is clicked", async () => {
			const mockOnLogout = vi.fn();
			mockGetJobs.mockResolvedValue([]);
			render(
				<JobManagementPage currentUser={MOCK_USER} onLogout={mockOnLogout} />,
			);
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});

			fireEvent.click(screen.getByRole("button", { name: "Test User" }));
			fireEvent.click(screen.getByText("Sign Out"));

			expect(mockOnLogout).toHaveBeenCalledOnce();
		});
	});
});
