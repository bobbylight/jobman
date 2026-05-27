import React from "react";
import { render, screen } from "@testing-library/react";
import AvgDaysChart from "./AvgDaysChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Bar: () => <div data-testid="bar" />,
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

const STAGE_DATA = [
	{ avgDays: 5, stage: "Applied" },
	{ avgDays: 3, stage: "Phone screen" },
	{ avgDays: 14, stage: "Interviewing" },
];

describe("avgDaysChart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows the empty-state message when avgDaysPerStage is empty", () => {
		render(<AvgDaysChart avgDaysPerStage={[]} />);
		expect(screen.getByText(/No transition data yet/i)).toBeInTheDocument();
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the bar chart when there is data", () => {
		render(<AvgDaysChart avgDaysPerStage={STAGE_DATA} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(
			screen.queryByText(/No transition data yet/i),
		).not.toBeInTheDocument();
	});

	it("renders a Bar element", () => {
		render(<AvgDaysChart avgDaysPerStage={STAGE_DATA} />);
		expect(screen.getByTestId("bar")).toBeInTheDocument();
	});

	it("renders with a single data point", () => {
		render(
			<AvgDaysChart avgDaysPerStage={[{ avgDays: 7, stage: "Applied" }]} />,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
