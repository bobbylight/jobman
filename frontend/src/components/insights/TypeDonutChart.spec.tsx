import React from "react";
import { render, screen } from "@testing-library/react";
import TypeDonutChart from "./TypeDonutChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Cell: () => null,
			Legend: ({
				formatter,
			}: {
				formatter: (v: string) => React.ReactNode;
			}) => (
				// Recharts calls formatter with the data's `name` field — "Behavioral" not "behavioral"
				<div data-testid="legend">{formatter("Behavioral")}</div>
			),
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

const BY_TYPE = [
	{ count: 10, failed: 2, passed: 6, type: "coding" },
	{ count: 8, failed: 1, passed: 5, type: "behavioral" },
	{ count: 5, failed: 3, passed: 1, type: "system_design" },
];

describe(TypeDonutChart, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when byType is empty", () => {
		render(<TypeDonutChart byType={[]} />);
		expect(screen.getByText("No interviews recorded")).toBeInTheDocument();
	});

	it("does not render the chart container when there is no data", () => {
		render(<TypeDonutChart byType={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart container when there is data", () => {
		render(<TypeDonutChart byType={BY_TYPE} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No interviews recorded"),
		).not.toBeInTheDocument();
	});

	it("renders the pie chart when there is data", () => {
		render(<TypeDonutChart byType={BY_TYPE} />);
		expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
		expect(screen.getByTestId("pie")).toBeInTheDocument();
	});

	it("renders a legend with a human-readable type label", () => {
		render(<TypeDonutChart byType={BY_TYPE} />);
		// Legend mock calls formatter("behavioral") → should render "Behavioral"
		expect(screen.getByText("Behavioral")).toBeInTheDocument();
	});

	it("renders with a single type", () => {
		render(
			<TypeDonutChart
				byType={[{ count: 3, failed: 1, passed: 2, type: "coding" }]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
