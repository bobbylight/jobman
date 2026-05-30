import React from "react";
import { render, screen } from "@testing-library/react";
import PipelineOverTimeChart from "./PipelineOverTimeChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Area: ({ dataKey }: { dataKey: string }) => (
				<div data-testid={`area-${dataKey}`} />
			),
			AreaChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="area-chart">{children}</div>
			),
			Legend: () => null,
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const STATUS_OVER_TIME = [
	{ count: 5, status: "not_started", week: "2026-03-01" },
	{ count: 3, status: "applied", week: "2026-03-01" },
	{ count: 4, status: "not_started", week: "2026-03-08" },
	{ count: 4, status: "applied", week: "2026-03-08" },
	{ count: 1, status: "interviewing", week: "2026-03-08" },
];

describe("pipelineOverTimeChart", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when statusOverTime is empty", () => {
		render(<PipelineOverTimeChart statusOverTime={[]} />);
		expect(screen.getByText(/No data yet/)).toBeInTheDocument();
	});

	it("does not render the chart when data is empty", () => {
		render(<PipelineOverTimeChart statusOverTime={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart container when there is data", () => {
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(screen.queryByText(/No data yet/)).not.toBeInTheDocument();
	});

	it("renders an Area for each status present in the data", () => {
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.getByTestId("area-not_started")).toBeInTheDocument();
		expect(screen.getByTestId("area-applied")).toBeInTheDocument();
		expect(screen.getByTestId("area-interviewing")).toBeInTheDocument();
	});

	it("does not render Areas for statuses absent from the data", () => {
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.queryByTestId("area-phone_screen")).not.toBeInTheDocument();
		expect(screen.queryByTestId("area-offer")).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("area-rejected_or_withdrawn"),
		).not.toBeInTheDocument();
	});

	it("renders one Area per unique status, not one per row", () => {
		// STATUS_OVER_TIME has 2 weeks × "not_started" — should still be 1 Area
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.getAllByTestId("area-not_started")).toHaveLength(1);
	});
});
