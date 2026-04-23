import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InsightsPage from "./InsightsPage";
import { api } from "../api";
import type { InterviewInsightsResponse } from "../types";

vi.mock(
	import("../api"),
	() =>
		({
			api: { getInterviewInsights: vi.fn() },
		}) as any,
);

vi.mock(
	import("./insights/TypeDonutChart"),
	() => ({ default: () => <div data-testid="type-donut-chart" /> }) as any,
);
vi.mock(
	import("./insights/PassRateByTypeChart"),
	() =>
		({ default: () => <div data-testid="pass-rate-by-type-chart" /> }) as any,
);
vi.mock(
	import("./insights/FeelingCalibrationChart"),
	() =>
		({
			default: () => <div data-testid="feeling-calibration-chart" />,
		}) as any,
);
vi.mock(
	import("./insights/QuestionsByTypeChart"),
	() =>
		({ default: () => <div data-testid="questions-by-type-chart" /> }) as any,
);
vi.mock(
	import("./insights/DifficultyDistributionChart"),
	() =>
		({
			default: () => <div data-testid="difficulty-distribution-chart" />,
		}) as any,
);
vi.mock(
	import("./insights/QuestionBankTable"),
	() => ({ default: () => <div data-testid="question-bank-table" /> }) as any,
);

const mockGetInterviewInsights = vi.mocked(api.getInterviewInsights);

const BASE_INSIGHTS: InterviewInsightsResponse = {
	avgDifficulty: 3.2,
	byStage: [{ count: 5, failed: 1, passed: 3, stage: "phone_screen" }],
	byType: [{ count: 5, failed: 1, passed: 3, type: "behavioral" }],
	difficultyDistribution: [{ count: 5, difficulty: 3, failed: 1, passed: 3 }],
	feelingVsResult: [{ failed: 1, feeling: "aced", noResult: 0, passed: 4 }],
	passRate: 0.75,
	questionsByType: [
		{ avgDifficulty: 3, count: 5, passRate: 0.6, type: "behavioral" },
	],
	recentQuestions: [],
	totalInterviews: 12,
	totalQuestions: 8,
	vibeVsResult: [{ count: 3, failed: 1, passed: 2, vibe: "casual" }],
};

describe(InsightsPage, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows a loading spinner while fetching", () => {
		mockGetInterviewInsights.mockReturnValue(new Promise(() => {}));
		render(<InsightsPage />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("hides the spinner after data loads", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
		);
	});

	it("shows an error message when the fetch fails", async () => {
		mockGetInterviewInsights.mockRejectedValue(new Error("Network error"));
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.getByText(/Failed to load insights/)).toBeInTheDocument(),
		);
	});

	it("renders all four stat card labels after data loads", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.getByText("Interviews")).toBeInTheDocument(),
		);
		expect(screen.getByText("Pass Rate")).toBeInTheDocument();
		expect(screen.getByText("Questions Answered")).toBeInTheDocument();
		expect(screen.getByText("Avg Difficulty")).toBeInTheDocument();
	});

	it("displays correct numeric values from the API response", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(
			() => {
				expect(screen.getByText("12")).toBeInTheDocument();
				expect(screen.getByText("75%")).toBeInTheDocument();
				expect(screen.getByText("8")).toBeInTheDocument();
			},
			{ timeout: 2000 },
		);
	});

	it("shows '—' for pass rate when it is null", async () => {
		mockGetInterviewInsights.mockResolvedValue({
			...BASE_INSIGHTS,
			passRate: null,
		});
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1),
		);
	});

	it("shows '—' for avg difficulty when it is null", async () => {
		mockGetInterviewInsights.mockResolvedValue({
			...BASE_INSIGHTS,
			avgDifficulty: null,
		});
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1),
		);
	});

	it("fetches with window='all' on initial render", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(mockGetInterviewInsights).toHaveBeenCalledWith("all"),
		);
	});

	it("re-fetches with window='30' when Last 30 days is selected", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(mockGetInterviewInsights).toHaveBeenCalledWith("all"),
		);

		fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
		await waitFor(() =>
			expect(mockGetInterviewInsights).toHaveBeenCalledWith("30"),
		);
	});

	it("re-fetches with window='90' when Last 90 days is selected", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(mockGetInterviewInsights).toHaveBeenCalledWith("all"),
		);

		fireEvent.click(screen.getByRole("button", { name: "Last 90 days" }));
		await waitFor(() =>
			expect(mockGetInterviewInsights).toHaveBeenCalledWith("90"),
		);
	});

	it("renders all chart components after data loads", async () => {
		mockGetInterviewInsights.mockResolvedValue(BASE_INSIGHTS);
		render(<InsightsPage />);
		await waitFor(() =>
			expect(screen.getByTestId("type-donut-chart")).toBeInTheDocument(),
		);
		expect(screen.getByTestId("pass-rate-by-type-chart")).toBeInTheDocument();
		expect(screen.getByTestId("feeling-calibration-chart")).toBeInTheDocument();
		expect(screen.getByTestId("questions-by-type-chart")).toBeInTheDocument();
		expect(
			screen.getByTestId("difficulty-distribution-chart"),
		).toBeInTheDocument();
		expect(screen.getByTestId("question-bank-table")).toBeInTheDocument();
	});

	it("does not render charts while loading", () => {
		mockGetInterviewInsights.mockReturnValue(new Promise(() => {}));
		render(<InsightsPage />);
		expect(screen.queryByTestId("type-donut-chart")).not.toBeInTheDocument();
		expect(screen.queryByTestId("question-bank-table")).not.toBeInTheDocument();
	});
});
