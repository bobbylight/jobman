import React from "react";
import { render, screen } from "@testing-library/react";
import DifficultyDistributionChart from "./DifficultyDistributionChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Bar: ({ children }: { children?: React.ReactNode }) => (
				<div data-testid="bar">{children}</div>
			),
			BarChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="bar-chart">{children}</div>
			),
			CartesianGrid: () => null,
			Legend: ({
				formatter,
			}: {
				formatter: (v: string) => React.ReactNode;
			}) => (
				<div data-testid="legend">
					{formatter("passed")}
					{formatter("failed")}
					{formatter("noResult")}
				</div>
			),
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const DIFFICULTY_DISTRIBUTION = [
	{ count: 5, difficulty: 1, failed: 1, passed: 3 },
	{ count: 12, difficulty: 2, failed: 3, passed: 7 },
	{ count: 15, difficulty: 3, failed: 5, passed: 8 },
	{ count: 8, difficulty: 4, failed: 4, passed: 3 },
	{ count: 3, difficulty: 5, failed: 2, passed: 1 },
];

describe(DifficultyDistributionChart, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when difficultyDistribution is empty", () => {
		render(<DifficultyDistributionChart difficultyDistribution={[]} />);
		expect(screen.getByText("No questions recorded yet")).toBeInTheDocument();
	});

	it("does not render the chart when there is no data", () => {
		render(<DifficultyDistributionChart difficultyDistribution={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart container when there is data", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={DIFFICULTY_DISTRIBUTION}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No questions recorded yet"),
		).not.toBeInTheDocument();
	});

	it("renders bar chart elements", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={DIFFICULTY_DISTRIBUTION}
			/>,
		);
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
	});

	it("renders legend with 'In interviews I passed' label", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={DIFFICULTY_DISTRIBUTION}
			/>,
		);
		expect(screen.getByText("In interviews I passed")).toBeInTheDocument();
	});

	it("renders legend with 'In interviews I failed' label", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={DIFFICULTY_DISTRIBUTION}
			/>,
		);
		expect(screen.getByText("In interviews I failed")).toBeInTheDocument();
	});

	it("renders legend with 'No interview result' label", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={DIFFICULTY_DISTRIBUTION}
			/>,
		);
		expect(screen.getByText("No interview result")).toBeInTheDocument();
	});

	it("renders with a single difficulty level", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={[
					{ count: 4, difficulty: 3, failed: 1, passed: 2 },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});

	it("handles questions with no pass/fail results recorded", () => {
		render(
			<DifficultyDistributionChart
				difficultyDistribution={[
					{ count: 5, difficulty: 2, failed: 0, passed: 0 },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
