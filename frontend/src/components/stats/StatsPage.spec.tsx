import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StatsPage from "./StatsPage";
import { api } from "../../api";
import { SnackbarProvider } from "../../useSnackbar";
import type { StatsResponse } from "../../types";
import { makeJobSearch } from "../../testUtils";

vi.mock(import("../../api"), async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		api: { getActiveSearch: vi.fn(), getStats: vi.fn() },
	} as any;
});

// Keep chart components out of these tests — recharts isn't layout-capable in jsdom.
vi.mock(
	import("./StatusDonutChart"),
	() =>
		({
			default: () => <div data-testid="status-donut-chart" />,
		}) as any,
);
vi.mock(
	import("./PipelineFunnelChart"),
	() =>
		({
			default: () => <div data-testid="pipeline-funnel-chart" />,
		}) as any,
);
vi.mock(
	import("./ApplicationsOverTime"),
	() =>
		({
			default: () => <div data-testid="applications-over-time" />,
		}) as any,
);

const mockGetStats = vi.mocked(api.getStats);
const mockGetActiveSearch = vi.mocked(api.getActiveSearch);

const BASE_STATS: StatsResponse = {
	activePipeline: 4,
	applicationsByWeek: [],
	avgDaysPerStage: [],
	byStatus: [{ status: "not_started", count: 4 }],
	companiesApplied: 7,
	companiesOnSited: 2,
	companiesPhoneScreened: 5,
	offersReceived: 1,
	responseRate: 0.5,
	interviewsByWeek: [],
	statusOverTime: [],
	topCompanies: [],
	totalApplications: 10,
	transitions: [],
};

function renderPage() {
	return render(
		<SnackbarProvider>
			<StatsPage />
		</SnackbarProvider>,
	);
}

describe("statsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetActiveSearch.mockResolvedValue(makeJobSearch());
	});

	it("shows a loading spinner while fetching stats", () => {
		mockGetStats.mockReturnValue(new Promise(() => {}));
		renderPage();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
	});

	it("shows an error message when the fetch fails", async () => {
		mockGetStats.mockRejectedValue(new Error("Network error"));
		renderPage();
		await waitFor(() =>
			expect(screen.getByText(/Failed to load stats/)).toBeInTheDocument(),
		);
	});

	it("renders all four metric card labels after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Total Applications")).toBeInTheDocument(),
		);
		expect(screen.getByText("Active Pipeline")).toBeInTheDocument();
		expect(screen.getByText("Offers Received")).toBeInTheDocument();
		expect(screen.getByText("Response Rate")).toBeInTheDocument();
	});

	it("displays the correct values from the API response", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		// Wait for all animated values simultaneously — they complete at slightly different ticks
		await waitFor(
			() => {
				expect(screen.getByText("10")).toBeInTheDocument();
				expect(screen.getByText("4")).toBeInTheDocument();
				expect(screen.getByText("1")).toBeInTheDocument();
				expect(screen.getByText("50%")).toBeInTheDocument();
			},
			{ timeout: 2000 },
		);
	});

	it("displays '—' for response rate when it is null", async () => {
		mockGetStats.mockResolvedValue({ ...BASE_STATS, responseRate: null });
		renderPage();
		await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
	});

	it("fetches with window='all' and scope='current' on initial render", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
		);
	});

	it("re-fetches with window='30' when Last 30 days is selected", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
		);

		mockGetStats.mockResolvedValue({ ...BASE_STATS, totalApplications: 3 });
		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));

		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("30", "current"),
		);
	});

	it("re-fetches with window='90' when Last 90 days is selected", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
		);

		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("90", "current"),
		);
	});

	it("renders the status donut chart after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(screen.getByTestId("status-donut-chart")).toBeInTheDocument(),
		);
	});

	it("renders the pipeline funnel chart after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(screen.getByTestId("pipeline-funnel-chart")).toBeInTheDocument(),
		);
	});

	it("renders the applications over time chart for 'all' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(screen.getByTestId("applications-over-time")).toBeInTheDocument(),
		);
	});

	it("hides the applications over time chart for '30' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
		);

		mockGetStats.mockResolvedValue(BASE_STATS);
		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));

		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("30", "current"),
		);
		expect(
			screen.queryByTestId("applications-over-time"),
		).not.toBeInTheDocument();
	});

	it("shows the applications over time chart for '90' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		renderPage();
		await waitFor(() =>
			expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
		);

		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		await waitFor(() =>
			expect(screen.getByTestId("applications-over-time")).toBeInTheDocument(),
		);
	});

	describe("round scoping", () => {
		it("shows the active round's name as a chip next to the title", async () => {
			mockGetActiveSearch.mockResolvedValue(
				makeJobSearch({ name: "Q3 2026 Search" }),
			);
			mockGetStats.mockResolvedValue(BASE_STATS);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Q3 2026 Search")).toBeInTheDocument(),
			);
		});

		it("does not show a round chip when there is no active round", async () => {
			mockGetActiveSearch.mockRejectedValue(new Error("no active round"));
			mockGetStats.mockResolvedValue(BASE_STATS);
			renderPage();
			await waitFor(() =>
				expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
			);
			expect(screen.queryByText("My Job Search")).not.toBeInTheDocument();
		});

		it("labels Top Companies as 'this round' by default", async () => {
			mockGetStats.mockResolvedValue(BASE_STATS);
			renderPage();
			await waitFor(() =>
				expect(
					screen.getByText("Top Companies (this round)"),
				).toBeInTheDocument(),
			);
		});

		it("re-fetches with scope='all' and relabels Top Companies when 'All rounds' is toggled on", async () => {
			mockGetStats.mockResolvedValue(BASE_STATS);
			renderPage();
			await waitFor(() =>
				expect(mockGetStats).toHaveBeenCalledWith("all", "current"),
			);

			fireEvent.click(screen.getByRole("switch", { name: "All rounds" }));

			await waitFor(() =>
				expect(mockGetStats).toHaveBeenCalledWith("all", "all"),
			);
			expect(screen.getByText("Top Companies (all time)")).toBeInTheDocument();
		});

		it("hides the round chip once 'All rounds' is toggled on", async () => {
			mockGetActiveSearch.mockResolvedValue(
				makeJobSearch({ name: "Q3 2026 Search" }),
			);
			mockGetStats.mockResolvedValue(BASE_STATS);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Q3 2026 Search")).toBeInTheDocument(),
			);

			fireEvent.click(screen.getByRole("switch", { name: "All rounds" }));

			await waitFor(() =>
				expect(screen.queryByText("Q3 2026 Search")).not.toBeInTheDocument(),
			);
		});
	});
});
