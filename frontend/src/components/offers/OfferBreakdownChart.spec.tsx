import React from "react";
import { render, screen } from "@testing-library/react";
import OfferBreakdownChart from "./OfferBreakdownChart";
import { makeJob } from "../../testUtils";
import type { Offer, OfferComparisonEntry } from "../../types";

vi.mock(
	import("recharts"),
	() =>
		({
			Bar: ({ dataKey }: { dataKey: string }) => (
				<div data-testid={`bar-${dataKey}`} />
			),
			BarChart: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="bar-chart">{children}</div>
			),
			CartesianGrid: () => null,
			Legend: () => null,
			ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
				<div data-testid="recharts-container">{children}</div>
			),
			Tooltip: () => null,
			XAxis: () => null,
			YAxis: () => null,
		}) as any,
);

const BASE_OFFER: Offer = {
	id: 1,
	job_id: 1,
	base_pay_amount: 150_000,
	target_bonus_percent: 10,
	equity_amount: 200_000,
	equity_vesting_years: 4,
	equity_type: "rsus",
	signing_bonus_amount: 20_000,
	wellness_stipend_amount: 1200,
	other_amount: 5000,
	other_label: "Car allowance",
	other_is_recurring: true,
	k401_match_percent: 4,
	offer_deadline: "2026-07-01",
	notes: null,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

function makeOffer(overrides: Partial<Offer> = {}): Offer {
	return { ...BASE_OFFER, ...overrides };
}

function makeEntry(
	overrides: Partial<OfferComparisonEntry> = {},
): OfferComparisonEntry {
	return { job: makeJob(), offer: makeOffer(), ...overrides };
}

describe("offerBreakdownChart", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows an empty state when no entries have offer data", () => {
		render(<OfferBreakdownChart entries={[makeEntry({ offer: null })]} />);
		expect(screen.getByText(/No offer data yet/)).toBeInTheDocument();
		expect(screen.queryByTestId("recharts-container")).not.toBeInTheDocument();
	});

	it("renders the chart when at least one entry has offer data", () => {
		render(
			<OfferBreakdownChart
				entries={[
					makeEntry(),
					makeEntry({ job: makeJob({ id: 2 }), offer: null }),
				]}
			/>,
		);
		expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
	});

	it("renders a Bar segment for each compensation component", () => {
		render(<OfferBreakdownChart entries={[makeEntry()]} />);
		expect(screen.getByTestId("bar-base")).toBeInTheDocument();
		expect(screen.getByTestId("bar-bonus")).toBeInTheDocument();
		expect(screen.getByTestId("bar-equity")).toBeInTheDocument();
		expect(screen.getByTestId("bar-signingBonus")).toBeInTheDocument();
		expect(screen.getByTestId("bar-stipend")).toBeInTheDocument();
		expect(screen.getByTestId("bar-other")).toBeInTheDocument();
	});
});
