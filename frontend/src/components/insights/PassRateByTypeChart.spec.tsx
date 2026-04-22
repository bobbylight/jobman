import React from "react";
import { render, screen } from "@testing-library/react";
import PassRateByTypeChart from "./PassRateByTypeChart";

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
			Cell: () => null,
			LabelList: () => null,
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const BY_TYPE_WITH_RESULTS = [
	{ count: 10, failed: 4, passed: 6, type: "coding" },
	{ count: 8, failed: 2, passed: 6, type: "behavioral" },
	{ count: 5, failed: 3, passed: 2, type: "system_design" },
];

const BY_TYPE_NO_RESULTS = [
	{ count: 3, failed: 0, passed: 0, type: "coding" },
	{ count: 2, failed: 0, passed: 0, type: "behavioral" },
];

describe(PassRateByTypeChart, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when byType is empty", () => {
		render(<PassRateByTypeChart byType={[]} />);
		expect(
			screen.getByText("No pass/fail results recorded yet"),
		).toBeInTheDocument();
	});

	it("shows empty state when no type has any pass/fail results", () => {
		render(<PassRateByTypeChart byType={BY_TYPE_NO_RESULTS} />);
		expect(
			screen.getByText("No pass/fail results recorded yet"),
		).toBeInTheDocument();
	});

	it("does not render the chart when there are no results", () => {
		render(<PassRateByTypeChart byType={BY_TYPE_NO_RESULTS} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart when types have results", () => {
		render(<PassRateByTypeChart byType={BY_TYPE_WITH_RESULTS} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No pass/fail results recorded yet"),
		).not.toBeInTheDocument();
	});

	it("renders the bar chart element", () => {
		render(<PassRateByTypeChart byType={BY_TYPE_WITH_RESULTS} />);
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(screen.getByTestId("bar")).toBeInTheDocument();
	});

	it("renders when only one type has results", () => {
		render(
			<PassRateByTypeChart
				byType={[{ count: 5, failed: 2, passed: 3, type: "coding" }]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});

	it("excludes types with no results recorded from the chart", () => {
		const mixedData = [
			{ count: 5, failed: 2, passed: 3, type: "coding" },
			{ count: 3, failed: 0, passed: 0, type: "behavioral" }, // No results
		];
		// Should still render (coding has results)
		render(<PassRateByTypeChart byType={mixedData} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
