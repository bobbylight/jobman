import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StatsPage from "./StatsPage";
import { api } from "../api";
import type { StatsResponse } from "../types";

vi.mock(
	import("../api"),
	() =>
		({
			api: { getStats: vi.fn() },
		}) as any,
);

// Keep chart components out of these tests — recharts isn't layout-capable in jsdom.
vi.mock(
	import("./stats/StatusDonutChart"),
	() =>
		({
			default: () => <div data-testid="status-donut-chart" />,
		}) as any,
);
vi.mock(
	import("./stats/PipelineFunnelChart"),
	() =>
		({
			default: () => <div data-testid="pipeline-funnel-chart" />,
		}) as any,
);
vi.mock(
	import("./stats/ApplicationsOverTime"),
	() =>
		({
			default: () => <div data-testid="applications-over-time" />,
		}) as any,
);

const mockGetStats = vi.mocked(api.getStats);

const BASE_STATS: StatsResponse = {
	activePipeline: 4,
	applicationsByWeek: [],
	avgDaysPerStage: [],
	byStatus: [{ status: "Not started", count: 4 }],
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

describe(StatsPage, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows a loading spinner while fetching stats", () => {
		mockGetStats.mockReturnValue(new Promise(() => {}));
		render(<StatsPage />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
	});

	it("shows an error message when the fetch fails", async () => {
		mockGetStats.mockRejectedValue(new Error("Network error"));
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.getByText(/Failed to load stats/)).toBeInTheDocument(),
		);
	});

	it("renders all four metric card labels after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.getByText("Total Applications")).toBeInTheDocument(),
		);
		expect(screen.getByText("Active Pipeline")).toBeInTheDocument();
		expect(screen.getByText("Offers Received")).toBeInTheDocument();
		expect(screen.getByText("Response Rate")).toBeInTheDocument();
	});

	it("displays the correct values from the API response", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
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
		render(<StatsPage />);
		await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
	});

	it("fetches with window='all' on initial render", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("all"));
	});

	it("re-fetches with window='30' when Last 30 days is selected", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("all"));

		mockGetStats.mockResolvedValue({ ...BASE_STATS, totalApplications: 3 });
		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));

		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("30"));
	});

	it("re-fetches with window='90' when Last 90 days is selected", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("all"));

		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("90"));
	});

	it("renders the status donut chart after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.getByTestId("status-donut-chart")).toBeInTheDocument(),
		);
	});

	it("renders the pipeline funnel chart after data loads", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.getByTestId("pipeline-funnel-chart")).toBeInTheDocument(),
		);
	});

	it("renders the applications over time chart for 'all' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() =>
			expect(screen.getByTestId("applications-over-time")).toBeInTheDocument(),
		);
	});

	it("hides the applications over time chart for '30' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("all"));

		mockGetStats.mockResolvedValue(BASE_STATS);
		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));

		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("30"));
		expect(
			screen.queryByTestId("applications-over-time"),
		).not.toBeInTheDocument();
	});

	it("shows the applications over time chart for '90' window", async () => {
		mockGetStats.mockResolvedValue(BASE_STATS);
		render(<StatsPage />);
		await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith("all"));

		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		await waitFor(() =>
			expect(screen.getByTestId("applications-over-time")).toBeInTheDocument(),
		);
	});
});
