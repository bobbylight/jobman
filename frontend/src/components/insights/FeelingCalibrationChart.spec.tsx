import React from "react";
import { render, screen } from "@testing-library/react";
import FeelingCalibrationChart from "./FeelingCalibrationChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Bar: ({ children }: { dataKey: string; children?: React.ReactNode }) => (
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

// R ≈ 0.992 — well-calibrated
const WELL_CALIBRATED = [
	{ feeling: "aced", failed: 1, noResult: 0, passed: 9 },
	{ feeling: "pretty_good", failed: 3, noResult: 0, passed: 7 },
	{ feeling: "meh", failed: 5, noResult: 0, passed: 5 },
	{ feeling: "struggled", failed: 8, noResult: 0, passed: 2 },
	{ feeling: "flunked", failed: 9, noResult: 0, passed: 1 },
];

// R ≈ 0.693 — reasonably calibrated
const REASONABLY_CALIBRATED = [
	{ feeling: "aced", failed: 5, noResult: 0, passed: 5 },
	{ feeling: "pretty_good", failed: 7, noResult: 0, passed: 3 },
	{ feeling: "meh", failed: 6, noResult: 0, passed: 4 },
	{ feeling: "struggled", failed: 8, noResult: 0, passed: 2 },
	{ feeling: "flunked", failed: 7, noResult: 0, passed: 3 },
];

// R ≈ 0.325 — not well-calibrated
const POORLY_CALIBRATED = [
	{ feeling: "aced", failed: 7, noResult: 0, passed: 3 },
	{ feeling: "pretty_good", failed: 2, noResult: 0, passed: 8 },
	{ feeling: "meh", failed: 8, noResult: 0, passed: 2 },
	{ feeling: "struggled", failed: 4, noResult: 0, passed: 6 },
	{ feeling: "flunked", failed: 9, noResult: 0, passed: 1 },
];

// Only 4 total results — below the minimum of 5
const TOO_FEW_RESULTS = [
	{ feeling: "aced", failed: 0, noResult: 3, passed: 2 },
	{ feeling: "flunked", failed: 2, noResult: 3, passed: 0 },
];

// All noResult — no pass/fail data at all
const ALL_NO_RESULT = [
	{ feeling: "aced", failed: 0, noResult: 5, passed: 0 },
	{ feeling: "meh", failed: 0, noResult: 3, passed: 0 },
];

describe(FeelingCalibrationChart, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows empty state when feelingVsResult is empty", () => {
		render(<FeelingCalibrationChart feelingVsResult={[]} />);
		expect(
			screen.getByText(
				"Record how you felt after interviews to see calibration",
			),
		).toBeInTheDocument();
	});

	it("does not render the chart when data is empty", () => {
		render(<FeelingCalibrationChart feelingVsResult={[]} />);
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart when data is present", () => {
		render(<FeelingCalibrationChart feelingVsResult={WELL_CALIBRATED} />);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
		expect(
			screen.queryByText(
				"Record how you felt after interviews to see calibration",
			),
		).not.toBeInTheDocument();
	});

	it("shows 'well-calibrated' label when correlation is high", () => {
		render(<FeelingCalibrationChart feelingVsResult={WELL_CALIBRATED} />);
		expect(
			screen.getByText("You're well-calibrated — trust your gut."),
		).toBeInTheDocument();
	});

	it("shows 'reasonably calibrated' label when correlation is moderate", () => {
		render(<FeelingCalibrationChart feelingVsResult={REASONABLY_CALIBRATED} />);
		expect(screen.getByText("Reasonably calibrated.")).toBeInTheDocument();
	});

	it("shows 'don't quite line up' label when correlation is low", () => {
		render(<FeelingCalibrationChart feelingVsResult={POORLY_CALIBRATED} />);
		expect(
			screen.getByText("Your gut feeling and results don't quite line up."),
		).toBeInTheDocument();
	});

	it("does not show a calibration label when there are fewer than 5 results", () => {
		render(<FeelingCalibrationChart feelingVsResult={TOO_FEW_RESULTS} />);
		expect(
			screen.queryByText("You're well-calibrated — trust your gut."),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Reasonably calibrated."),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Your gut feeling and results don't quite line up."),
		).not.toBeInTheDocument();
	});

	it("does not show a calibration label when no results are recorded", () => {
		render(<FeelingCalibrationChart feelingVsResult={ALL_NO_RESULT} />);
		expect(
			screen.queryByText("You're well-calibrated — trust your gut."),
		).not.toBeInTheDocument();
	});
});
