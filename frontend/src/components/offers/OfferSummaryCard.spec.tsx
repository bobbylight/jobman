import React from "react";
import { render, screen } from "@testing-library/react";
import OfferSummaryCard from "./OfferSummaryCard";
import { makeJob } from "../../testUtils";
import type { Offer } from "../../types";

vi.mock(
	import("../../useCompanyLogo"),
	() => ({ useCompanyLogo: vi.fn(() => null) }) as any,
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
	other_amount: null,
	other_label: null,
	other_is_recurring: false,
	k401_match_percent: 4,
	offer_deadline: "2026-07-01",
	notes: null,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

function makeOffer(overrides: Partial<Offer> = {}): Offer {
	return { ...BASE_OFFER, ...overrides };
}

describe("offerSummaryCard", () => {
	it("renders the company name and role", () => {
		render(
			<OfferSummaryCard
				job={makeJob({ company: "Acme Corp", role: "Staff Engineer" })}
				offer={makeOffer()}
			/>,
		);
		expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
	});

	it("shows Year 1 and Ongoing TC when an offer is recorded", () => {
		render(<OfferSummaryCard job={makeJob()} offer={makeOffer()} />);

		// Year 1: 150,000 + 15,000 (bonus) + 50,000 (equity/yr) + 20,000 (signing) + 1,200 (stipend) = 236,200
		expect(screen.getByText("$236,200")).toBeInTheDocument();
		// Ongoing: 150,000 + 15,000 + 50,000 + 1,200 = 216,200
		expect(screen.getByText("$216,200")).toBeInTheDocument();
	});

	it("shows the 'No offer recorded' indicator when offer is null", () => {
		render(<OfferSummaryCard job={makeJob()} offer={null} />);
		expect(screen.getByText("No offer recorded")).toBeInTheDocument();
		expect(screen.queryByText("Year 1 TC")).not.toBeInTheDocument();
	});
});
