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
	{ count: 5, status: "Not started", week: "2026-03-01" },
	{ count: 3, status: "Resume submitted", week: "2026-03-01" },
	{ count: 4, status: "Not started", week: "2026-03-08" },
	{ count: 4, status: "Resume submitted", week: "2026-03-08" },
	{ count: 1, status: "Interviewing", week: "2026-03-08" },
];

describe(PipelineOverTimeChart, () => {
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
		expect(screen.getByTestId("area-Not started")).toBeInTheDocument();
		expect(screen.getByTestId("area-Resume submitted")).toBeInTheDocument();
		expect(screen.getByTestId("area-Interviewing")).toBeInTheDocument();
	});

	it("does not render Areas for statuses absent from the data", () => {
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.queryByTestId("area-Phone screen")).not.toBeInTheDocument();
		expect(screen.queryByTestId("area-Offer!")).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("area-Rejected/Withdrawn"),
		).not.toBeInTheDocument();
	});

	it("renders one Area per unique status, not one per row", () => {
		// STATUS_OVER_TIME has 2 weeks × "Not started" — should still be 1 Area
		render(<PipelineOverTimeChart statusOverTime={STATUS_OVER_TIME} />);
		expect(screen.getAllByTestId("area-Not started")).toHaveLength(1);
	});
});
