import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PipelineFunnelChart from "./PipelineFunnelChart";

vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="recharts-container">{children}</div>
	),
	BarChart: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="bar-chart">{children}</div>
	),
	Bar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="bar">{children}</div>
	),
	XAxis: () => null,
	YAxis: () => null,
	Tooltip: () => null,
	Cell: () => null,
	LabelList: () => null,
}));

const BY_STATUS_DATA = [
	{ status: "Not started", count: 5 },
	{ status: "Resume submitted", count: 3 },
	{ status: "Phone screen", count: 2 },
	{ status: "Interviewing", count: 1 },
	{ status: "Offer!", count: 0 },
	{ status: "Rejected/Withdrawn", count: 2 },
];

describe("PipelineFunnelChart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows empty state when byStatus is empty", () => {
		render(<PipelineFunnelChart byStatus={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("shows empty state when all counts are zero", () => {
		render(
			<PipelineFunnelChart
				byStatus={[
					{ status: "Not started", count: 0 },
					{ status: "Phone screen", count: 0 },
				]}
			/>,
		);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
	});

	it("renders the bar chart when there is data", () => {
		render(<PipelineFunnelChart byStatus={BY_STATUS_DATA} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});

	it("renders a bar element for the data", () => {
		render(<PipelineFunnelChart byStatus={BY_STATUS_DATA} />);
		expect(screen.getByTestId("bar")).toBeInTheDocument();
	});

	it("renders when only some statuses have non-zero counts", () => {
		render(
			<PipelineFunnelChart
				byStatus={[
					{ status: "Not started", count: 0 },
					{ status: "Interviewing", count: 3 },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
