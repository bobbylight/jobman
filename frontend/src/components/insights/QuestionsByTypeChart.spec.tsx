import React from "react";
import { render, screen } from "@testing-library/react";
import QuestionsByTypeChart from "./QuestionsByTypeChart";

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

const QUESTIONS_BY_TYPE = [
	{ avgDifficulty: 3.8, count: 12, passRate: 0.5, type: "coding" },
	{ avgDifficulty: 2.1, count: 9, passRate: 0.78, type: "behavioral" },
	{ avgDifficulty: 4.2, count: 6, passRate: null, type: "system_design" },
];

describe(QuestionsByTypeChart, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when questionsByType is empty", () => {
		render(<QuestionsByTypeChart questionsByType={[]} />);
		expect(screen.getByText("No questions recorded yet")).toBeInTheDocument();
	});

	it("does not render the chart when there is no data", () => {
		render(<QuestionsByTypeChart questionsByType={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart container when there is data", () => {
		render(<QuestionsByTypeChart questionsByType={QUESTIONS_BY_TYPE} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText("No questions recorded yet"),
		).not.toBeInTheDocument();
	});

	it("renders the bar chart and bar elements", () => {
		render(<QuestionsByTypeChart questionsByType={QUESTIONS_BY_TYPE} />);
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(screen.getByTestId("bar")).toBeInTheDocument();
	});

	it("renders with a single question type", () => {
		render(
			<QuestionsByTypeChart
				questionsByType={[
					{ avgDifficulty: 3, count: 5, passRate: 0.6, type: "coding" },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});

	it("renders correctly when passRate is null for a type", () => {
		render(
			<QuestionsByTypeChart
				questionsByType={[
					{ avgDifficulty: 4, count: 3, passRate: null, type: "system_design" },
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});
});
