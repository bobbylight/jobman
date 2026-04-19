import React from "react";
import { render, screen } from "@testing-library/react";
import ApplicationsOverTime from "./ApplicationsOverTime";

vi.mock(
	import("recharts"),
	() =>
		({
			CartesianGrid: () => null,
			Line: () => <div data-testid="line" />,
			LineChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="line-chart">{children}</div>
			),
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const WEEKLY_DATA = [
	{ count: 3, week: "2025-W10" },
	{ count: 5, week: "2025-W11" },
	{ count: 2, week: "2025-W12" },
];

describe(ApplicationsOverTime, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows empty state when applicationsByWeek is empty", () => {
		render(<ApplicationsOverTime applicationsByWeek={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the line chart when there is data", () => {
		render(<ApplicationsOverTime applicationsByWeek={WEEKLY_DATA} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(screen.getByTestId("line-chart")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});

	it("renders a Line element", () => {
		render(<ApplicationsOverTime applicationsByWeek={WEEKLY_DATA} />);
		expect(screen.getByTestId("line")).toBeInTheDocument();
	});

	it("renders with a single data point", () => {
		render(
			<ApplicationsOverTime
				applicationsByWeek={[{ count: 1, week: "2025-W01" }]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
