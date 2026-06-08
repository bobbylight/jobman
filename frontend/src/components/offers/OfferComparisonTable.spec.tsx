import React from "react";
import { render, screen, within } from "@testing-library/react";
import OfferComparisonTable from "./OfferComparisonTable";
import { makeJob } from "../../testUtils";
import type { Offer, OfferComparisonEntry } from "../../types";

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

describe("offerComparisonTable", () => {
	it("renders a column header for each company", () => {
		render(
			<OfferComparisonTable
				entries={[
					makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
					makeEntry({ job: makeJob({ id: 2, company: "Globex" }) }),
				]}
			/>,
		);
		expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		expect(screen.getByText("Globex")).toBeInTheDocument();
	});

	it("renders formatted values for compensation fields", () => {
		render(<OfferComparisonTable entries={[makeEntry()]} />);
		expect(screen.getByText("$150,000/yr")).toBeInTheDocument();
		expect(screen.getByText("10%")).toBeInTheDocument();
		expect(screen.getByText("$20,000")).toBeInTheDocument();
		expect(screen.getByText(/Car allowance/)).toBeInTheDocument();
	});

	it("shows dashes for missing fields and missing offers", () => {
		render(
			<OfferComparisonTable
				entries={[
					makeEntry({
						job: makeJob({ id: 1 }),
						offer: makeOffer({ signing_bonus_amount: null }),
					}),
					makeEntry({ job: makeJob({ id: 2 }), offer: null }),
				]}
			/>,
		);
		const dashes = screen.getAllByText("—");
		// At least one for the null signing_bonus_amount and a full row of dashes for the null offer.
		expect(dashes.length).toBeGreaterThan(1);
	});

	it("renders a Total Comp footer row with correct Year 1 and Ongoing values", () => {
		render(<OfferComparisonTable entries={[makeEntry()]} />);

		// Year 1: 150,000 + 15,000 + 50,000 + 20,000 + 1,200 + 5,000 = 241,200
		const year1Row = screen.getByText("Total Comp (Year 1)").closest("tr");
		expect(year1Row).not.toBeNull();
		expect(
			within(year1Row as HTMLElement).getByText("$241,200"),
		).toBeInTheDocument();

		// Ongoing: 150,000 + 15,000 + 50,000 + 1,200 + 5,000 (recurring) = 221,200
		const ongoingRow = screen.getByText("Total Comp (Ongoing)").closest("tr");
		expect(ongoingRow).not.toBeNull();
		expect(
			within(ongoingRow as HTMLElement).getByText("$221,200"),
		).toBeInTheDocument();
	});
});
