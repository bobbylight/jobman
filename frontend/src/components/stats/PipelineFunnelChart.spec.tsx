import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PipelineFunnelChart from "./PipelineFunnelChart";

vi.mock("recharts", () => ({
	Sankey: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sankey-chart">{children}</div>
	),
	Tooltip: () => null,
}));

const TRANSITIONS = [
	{ from: "Not started", to: "Resume submitted", count: 8 },
	{ from: "Resume submitted", to: "Phone screen", count: 5 },
	{ from: "Resume submitted", to: "Rejected/Withdrawn", count: 3 },
	{ from: "Phone screen", to: "Interviewing", count: 3 },
	{ from: "Phone screen", to: "Rejected/Withdrawn", count: 2 },
	{ from: "Interviewing", to: "Offer!", count: 1 },
	{ from: "Interviewing", to: "Rejected/Withdrawn", count: 2 },
];

describe("PipelineFunnelChart", () => {
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
