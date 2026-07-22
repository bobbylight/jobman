import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppShell from "./AppShell";
import { ApiError, api } from "../../api";
import { SnackbarProvider } from "../../useSnackbar";
import type { User } from "../../types";
import { makeJobSearch } from "../../testUtils";

const mockNavigate = vi.fn();

vi.mock(import("react-router-dom"), async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("react-router-dom")>();
	return {
		...actual,
		Outlet: () => <div data-testid="outlet" />,
		useNavigate: () => mockNavigate,
	};
});

vi.mock(import("../../api"), () => {
	class MockApiError extends Error {
		status: number;
		body: unknown;

		constructor(status: number, body: unknown) {
			super(`API error ${status}`);
			this.name = "MockApiError";
			this.status = status;
			this.body = body;
		}
	}
	return {
		ApiError: MockApiError,
		api: {
			getActiveSearch: vi.fn(),
			listSearches: vi.fn(),
			startNewSearch: vi.fn(),
		},
	} as any;
});

const mockGetActiveSearch = vi.mocked(api.getActiveSearch);
const mockStartNewSearch = vi.mocked(api.startNewSearch);
const mockListSearches = vi.mocked(api.listSearches);

const MOCK_USER: User = {
	avatarUrl: null,
	displayName: "Test User",
	email: "test@example.com",
	id: 1,
};

const DEFAULT_PROPS = {
	currentUser: MOCK_USER,
	onLogout: vi.fn(),
};

function renderAppShell(props = DEFAULT_PROPS, initialPath = "/jobs") {
	return render(
		<SnackbarProvider>
			<MemoryRouter initialEntries={[initialPath]}>
				<AppShell {...props} />
			</MemoryRouter>
		</SnackbarProvider>,
	);
}

function openUserMenu() {
	fireEvent.click(screen.getByRole("button", { name: "User menu" }));
}

describe("appShell", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetActiveSearch.mockRejectedValue(
			new ApiError(404, { error: "No active job search" }),
		);
	});

	it("renders the logo", () => {
		renderAppShell();
		expect(screen.getByRole("img", { name: "JobMan" })).toBeInTheDocument();
	});

	it("renders the Board nav button", () => {
		renderAppShell();
		expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
	});

	it("renders the Calendar nav button", () => {
		renderAppShell();
		expect(
			screen.getByRole("button", { name: "Calendar" }),
		).toBeInTheDocument();
	});

	it("renders the Stats nav button", () => {
		renderAppShell();
		expect(screen.getByRole("button", { name: "Stats" })).toBeInTheDocument();
	});

	it("renders the outlet", () => {
		renderAppShell();
		expect(screen.getByTestId("outlet")).toBeInTheDocument();
	});

	it("navigates to /jobs when Board is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Board" }));
		expect(mockNavigate).toHaveBeenCalledWith("/jobs");
	});

	it("navigates to /calendar when Calendar is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
		expect(mockNavigate).toHaveBeenCalledWith("/calendar");
	});

	it("navigates to /stats when Stats is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "Stats" }));
		expect(mockNavigate).toHaveBeenCalledWith("/stats");
	});

	it("renders the user menu button", () => {
		renderAppShell();
		expect(
			screen.getByRole("button", { name: "User menu" }),
		).toBeInTheDocument();
	});

	it("renders avatar with src when avatarUrl is provided", () => {
		renderAppShell({
			...DEFAULT_PROPS,
			currentUser: {
				...MOCK_USER,
				avatarUrl: "https://example.com/avatar.png",
			},
		});
		expect(screen.getByRole("img", { name: "Test User" })).toBeInTheDocument();
	});

	it("opens user menu on avatar button click", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		expect(
			screen.getByRole("menuitem", { name: /Sign Out/ }),
		).toBeInTheDocument();
	});

	it("calls onLogout when Sign Out is clicked", () => {
		const onLogout = vi.fn();
		renderAppShell({ ...DEFAULT_PROPS, onLogout });
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/ }));
		expect(onLogout).toHaveBeenCalledOnce();
	});

	it("closes user menu when Sign Out is clicked", () => {
		renderAppShell();
		fireEvent.click(screen.getByRole("button", { name: "User menu" }));
		fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/ }));
		expect(
			screen.queryByRole("menuitem", { name: /Sign Out/ }),
		).not.toBeInTheDocument();
	});

	describe("new job search", () => {
		it("shows a 'New Job Search' item in the user menu", () => {
			renderAppShell();
			openUserMenu();
			expect(
				screen.getByRole("menuitem", { name: /New Job Search/ }),
			).toBeInTheDocument();
		});

		it("opens the name-entry dialog and closes the user menu when clicked", () => {
			renderAppShell();
			openUserMenu();
			fireEvent.click(screen.getByRole("menuitem", { name: /New Job Search/ }));

			expect(screen.getByText("Start a New Job Search")).toBeInTheDocument();
			expect(
				screen.queryByRole("menuitem", { name: /Sign Out/ }),
			).not.toBeInTheDocument();
		});

		it("shows a second confirmation dialog after the name is entered, without calling the API yet", () => {
			renderAppShell();
			openUserMenu();
			fireEvent.click(screen.getByRole("menuitem", { name: /New Job Search/ }));
			fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
				target: { value: "Search 2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Continue" }));

			expect(screen.getByText("Start new job search?")).toBeInTheDocument();
			expect(mockStartNewSearch).not.toHaveBeenCalled();
		});

		it("calls the API only after the second confirmation, and updates the round", async () => {
			mockGetActiveSearch.mockResolvedValue(
				makeJobSearch({ name: "Search 1" }),
			);
			mockStartNewSearch.mockResolvedValue(
				makeJobSearch({ id: 2, name: "Search 2" }),
			);
			renderAppShell();
			openUserMenu();
			fireEvent.click(screen.getByRole("menuitem", { name: /New Job Search/ }));
			fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
				target: { value: "Search 2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Continue" }));
			fireEvent.click(screen.getByRole("button", { name: "Start Job Search" }));

			await waitFor(() =>
				expect(mockStartNewSearch).toHaveBeenCalledWith("Search 2", null),
			);
			await waitFor(() =>
				expect(
					screen.getByText('Started new job search "Search 2"'),
				).toBeInTheDocument(),
			);
			await waitFor(() =>
				expect(
					screen.queryByText("Start new job search?"),
				).not.toBeInTheDocument(),
			);
		});

		it("cancelling the confirmation dialog does not call the API", async () => {
			renderAppShell();
			openUserMenu();
			fireEvent.click(screen.getByRole("menuitem", { name: /New Job Search/ }));
			fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
				target: { value: "Search 2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Continue" }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

			await waitFor(() =>
				expect(
					screen.queryByText("Start new job search?"),
				).not.toBeInTheDocument(),
			);
			expect(mockStartNewSearch).not.toHaveBeenCalled();
		});

		it("returns to the name-entry dialog with blocking jobs when the round can't be closed", async () => {
			mockStartNewSearch.mockRejectedValue(
				new ApiError(409, {
					blockingJobs: [
						{ id: 5, company: "Acme", role: "Engineer", status: "applied" },
					],
				}),
			);
			renderAppShell();
			openUserMenu();
			fireEvent.click(screen.getByRole("menuitem", { name: /New Job Search/ }));
			fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
				target: { value: "Search 2" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Continue" }));
			fireEvent.click(screen.getByRole("button", { name: "Start Job Search" }));

			await waitFor(() => {
				expect(screen.getByText(/Acme – Engineer/)).toBeInTheDocument();
			});
			await waitFor(() =>
				expect(
					screen.queryByText("Start new job search?"),
				).not.toBeInTheDocument(),
			);
		});
	});

	describe("past job searches", () => {
		it("shows a 'Past Job Searches' item in the user menu", () => {
			renderAppShell();
			openUserMenu();
			expect(
				screen.getByRole("menuitem", { name: /Past Job Searches/ }),
			).toBeInTheDocument();
		});

		it("opens the dialog and closes the user menu when clicked", () => {
			mockListSearches.mockReturnValue(new Promise(() => {}));
			renderAppShell();
			openUserMenu();
			fireEvent.click(
				screen.getByRole("menuitem", { name: /Past Job Searches/ }),
			);

			expect(
				screen.getByRole("heading", { name: "Past Job Searches" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("menuitem", { name: /Sign Out/ }),
			).not.toBeInTheDocument();
		});

		it("excludes the active (still-open) round from the list", async () => {
			mockListSearches.mockResolvedValue([
				makeJobSearch({ closed_at: null, id: 1, name: "Current Search" }),
				makeJobSearch({
					closed_at: "2026-01-01T00:00:00.000Z",
					id: 2,
					name: "Old Search",
				}),
			]);
			renderAppShell();
			openUserMenu();
			fireEvent.click(
				screen.getByRole("menuitem", { name: /Past Job Searches/ }),
			);

			await waitFor(() => {
				expect(screen.getByText("Old Search")).toBeInTheDocument();
			});
			expect(screen.queryByText("Current Search")).not.toBeInTheDocument();
		});

		it("shows an empty state when there are no closed rounds", async () => {
			mockListSearches.mockResolvedValue([
				makeJobSearch({ closed_at: null, id: 1, name: "Current Search" }),
			]);
			renderAppShell();
			openUserMenu();
			fireEvent.click(
				screen.getByRole("menuitem", { name: /Past Job Searches/ }),
			);

			await waitFor(() => {
				expect(
					screen.getByText(/No past job searches yet/i),
				).toBeInTheDocument();
			});
		});

		it("navigates to the history route and closes the dialog when a round is clicked", async () => {
			mockListSearches.mockResolvedValue([
				makeJobSearch({
					closed_at: "2026-01-01T00:00:00.000Z",
					id: 2,
					name: "Old Search",
				}),
			]);
			renderAppShell();
			openUserMenu();
			fireEvent.click(
				screen.getByRole("menuitem", { name: /Past Job Searches/ }),
			);

			await waitFor(() => {
				expect(screen.getByText("Old Search")).toBeInTheDocument();
			});
			fireEvent.click(screen.getByText("Old Search"));

			expect(mockNavigate).toHaveBeenCalledWith("/jobs/history/2");
			await waitFor(() => {
				expect(
					screen.queryByRole("heading", { name: "Past Job Searches" }),
				).not.toBeInTheDocument();
			});
		});
	});
});
