import React from "react";
import { render, screen } from "@testing-library/react";
import InterviewsPerWeekChart from "./InterviewsPerWeekChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Bar: () => <div data-testid="bar" />,
			BarChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="bar-chart">{children}</div>
			),
			CartesianGrid: () => null,
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const WEEKLY_DATA = [
	{ count: 2, week: "2025-W10" },
	{ count: 4, week: "2025-W11" },
	{ count: 1, week: "2025-W12" },
];

describe(InterviewsPerWeekChart, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows the empty-state message when interviewsByWeek is empty", () => {
		render(<InterviewsPerWeekChart interviewsByWeek={[]} />);
		expect(screen.getByText("No interviews recorded")).toBeInTheDocument();
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the bar chart when there is data", () => {
		render(<InterviewsPerWeekChart interviewsByWeek={WEEKLY_DATA} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(
			screen.queryByText("No interviews recorded"),
		).not.toBeInTheDocument();
	});

	it("renders a Bar element", () => {
		render(<InterviewsPerWeekChart interviewsByWeek={WEEKLY_DATA} />);
		expect(screen.getByTestId("bar")).toBeInTheDocument();
	});

	it("renders with a single data point", () => {
		render(
			<InterviewsPerWeekChart
				interviewsByWeek={[{ count: 3, week: "2025-W01" }]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
