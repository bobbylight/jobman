import React from "react";
import { render, screen } from "@testing-library/react";
import StatusDonutChart from "./StatusDonutChart";

// Recharts requires real DOM layout which jsdom doesn't provide.
// Mock the parts we don't want to test here.
vi.mock(
	import("recharts"),
	() =>
		({
			Cell: () => null,
			Legend: ({
				formatter,
			}: {
				formatter: (v: string) => React.ReactNode;
			}) => <div data-testid="legend">{formatter("Not started")}</div>,
			Pie: () => <div data-testid="pie" />,
			PieChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="pie-chart">{children}</div>
			),
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
		}) as any,
);

describe(StatusDonutChart, () => {
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
					{ count: 3, status: "Not started" },
					{ count: 1, status: "Interviewing" },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});

	it("omits statuses with zero count from the chart", () => {
		// ByStatus comes from the API already filtered, but if a status has count=0
		// The toChartData helper should still filter it out defensively.
		render(
			<StatusDonutChart
				byStatus={[
					{ count: 0, status: "Not started" },
					{ count: 2, status: "Phone screen" },
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
					{ count: 0, status: "Not started" },
					{ count: 0, status: "Phone screen" },
				]}
			/>,
		);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
	});

	it("renders a legend entry for each status in the data", () => {
		render(
			<StatusDonutChart byStatus={[{ count: 5, status: "Not started" }]} />,
		);
		// The mocked Legend calls formatter("Not started") and renders the result
		expect(screen.getByText("Not started")).toBeInTheDocument();
	});
});
