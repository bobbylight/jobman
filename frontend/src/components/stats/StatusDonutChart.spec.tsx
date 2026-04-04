import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StatusDonutChart from "./StatusDonutChart";

// recharts requires real DOM layout which jsdom doesn't provide.
// Mock the parts we don't want to test here.
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="recharts-container">{children}</div>
	),
	PieChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="pie-chart">{children}</div>
	),
	Pie: () => <div data-testid="pie" />,
	Cell: () => null,
	Tooltip: () => null,
	Legend: ({ formatter }: { formatter: (v: string) => React.ReactNode }) => (
		<div data-testid="legend">{formatter("Not started")}</div>
	),
}));

describe("StatusDonutChart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows the empty state message when byStatus is empty", () => {
		render(<StatusDonutChart byStatus={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
	});

	it("does not render the chart container when there is no data", () => {
		render(<StatusDonutChart byStatus={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart when there is data", () => {
		render(
			<StatusDonutChart
				byStatus={[
					{ status: "Not started", count: 3 },
					{ status: "Interviewing", count: 1 },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});

	it("omits statuses with zero count from the chart", () => {
		// byStatus comes from the API already filtered, but if a status has count=0
		// the toChartData helper should still filter it out defensively.
		render(
			<StatusDonutChart
				byStatus={[
					{ status: "Not started", count: 0 },
					{ status: "Phone screen", count: 2 },
				]}
			/>,
		);
		// Chart should render (at least one non-zero entry)
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});

	it("shows empty state when all counts are zero", () => {
		render(
			<StatusDonutChart
				byStatus={[
					{ status: "Not started", count: 0 },
					{ status: "Phone screen", count: 0 },
				]}
			/>,
		);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
	});

	it("renders a legend entry for each status in the data", () => {
		render(
			<StatusDonutChart byStatus={[{ status: "Not started", count: 5 }]} />,
		);
		// The mocked Legend calls formatter("Not started") and renders the result
		expect(screen.getByText("Not started")).toBeInTheDocument();
	});
});
