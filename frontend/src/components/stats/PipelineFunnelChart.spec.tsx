import React from "react";
import { render, screen } from "@testing-library/react";
import PipelineFunnelChart from "./PipelineFunnelChart";

vi.mock(
	import("recharts"),
	() =>
		({
			Sankey: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="sankey-chart">{children}</div>
			),
			Tooltip: () => null,
		}) as any,
);

const TRANSITIONS = [
	{ count: 8, from: "Not started", to: "Resume submitted" },
	{ count: 5, from: "Resume submitted", to: "Phone screen" },
	{ count: 3, from: "Resume submitted", to: "Rejected/Withdrawn" },
	{ count: 3, from: "Phone screen", to: "Interviewing" },
	{ count: 2, from: "Phone screen", to: "Rejected/Withdrawn" },
	{ count: 1, from: "Interviewing", to: "Offer!" },
	{ count: 2, from: "Interviewing", to: "Rejected/Withdrawn" },
];

describe(PipelineFunnelChart, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows empty state when transitions is empty", () => {
		render(<PipelineFunnelChart transitions={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
		expect(screen.queryByTestId("sankey-chart")).not.toBeInTheDocument();
	});

	it("renders the Sankey chart when there are transitions", () => {
		render(<PipelineFunnelChart transitions={TRANSITIONS} />);
		expect(screen.getByTestId("sankey-chart")).toBeInTheDocument();
		expect(
			screen.queryByText("No data for this period"),
		).not.toBeInTheDocument();
	});
});
