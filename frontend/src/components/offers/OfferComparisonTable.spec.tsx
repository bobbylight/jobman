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

// BASE_OFFER ongoing TC: 150k + 15k + 50k + 1.2k + 5k = 221,200
// Higher offer (base 180k) ongoing TC: 180k + 18k + 50k + 1.2k + 5k = 254,200

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

	describe("row-max bolding", () => {
		it("marks the max-valued cell in each body row with data-row-max", () => {
			// Entry 2 has higher base pay; entry 1 has all other fields identical.
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
						makeEntry({
							job: makeJob({ id: 2, company: "Globex" }),
							offer: makeOffer({ base_pay_amount: 180_000 }),
						}),
					]}
				/>,
			);

			const basePay = screen.getByText("Base Pay").closest("tr");
			expect(basePay).not.toBeNull();
			const cells = within(basePay as HTMLElement).getAllByRole("cell");
			// Cells[0] is the label; cells[1] is Acme (150k), cells[2] is Globex (180k)
			expect(cells[1]).not.toHaveAttribute("data-row-max");
			expect(cells[2]).toHaveAttribute("data-row-max", "true");
		});

		it("marks all tied max cells with data-row-max", () => {
			// Both offers have identical base pay — both should be marked.
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1 }) }),
						makeEntry({ job: makeJob({ id: 2 }) }),
					]}
				/>,
			);

			const basePay = screen.getByText("Base Pay").closest("tr");
			const cells = within(basePay as HTMLElement).getAllByRole("cell");
			expect(cells[1]).toHaveAttribute("data-row-max", "true");
			expect(cells[2]).toHaveAttribute("data-row-max", "true");
		});

		it("does not mark a null-offer cell as data-row-max", () => {
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1 }) }),
						makeEntry({ job: makeJob({ id: 2 }), offer: null }),
					]}
				/>,
			);

			const basePay = screen.getByText("Base Pay").closest("tr");
			const cells = within(basePay as HTMLElement).getAllByRole("cell");
			expect(cells[1]).toHaveAttribute("data-row-max", "true");
			expect(cells[2]).not.toHaveAttribute("data-row-max");
		});
	});

	describe("best-offer column highlighting", () => {
		it("marks all cells in the highest ongoing-TC column with data-best-offer", () => {
			// Entry 2 has higher base pay → higher ongoing TC → best column.
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
						makeEntry({
							job: makeJob({ id: 2, company: "Globex" }),
							offer: makeOffer({ base_pay_amount: 180_000 }),
						}),
					]}
				/>,
			);

			// Header
			expect(screen.getByText("Globex")).toHaveAttribute(
				"data-best-offer",
				"true",
			);
			expect(screen.getByText("Acme Corp")).not.toHaveAttribute(
				"data-best-offer",
			);

			// Body rows: check Base Pay cells (representative)
			const basePay = screen.getByText("Base Pay").closest("tr");
			const basePayCells = within(basePay as HTMLElement).getAllByRole("cell");
			expect(basePayCells[1]).not.toHaveAttribute("data-best-offer");
			expect(basePayCells[2]).toHaveAttribute("data-best-offer", "true");

			// Footer: check Total Comp (Ongoing) row
			const ongoingRow = screen.getByText("Total Comp (Ongoing)").closest("tr");
			const ongoingCells = within(ongoingRow as HTMLElement).getAllByRole(
				"cell",
			);
			expect(ongoingCells[1]).not.toHaveAttribute("data-best-offer");
			expect(ongoingCells[2]).toHaveAttribute("data-best-offer", "true");
		});

		it("marks all tied best-offer columns when ongoing TC is equal", () => {
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
						makeEntry({ job: makeJob({ id: 2, company: "Globex" }) }),
					]}
				/>,
			);

			expect(screen.getByText("Acme Corp")).toHaveAttribute(
				"data-best-offer",
				"true",
			);
			expect(screen.getByText("Globex")).toHaveAttribute(
				"data-best-offer",
				"true",
			);
		});

		it("does not mark a null-offer column as best offer", () => {
			render(
				<OfferComparisonTable
					entries={[
						makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
						makeEntry({
							job: makeJob({ id: 2, company: "Globex" }),
							offer: null,
						}),
					]}
				/>,
			);

			expect(screen.getByText("Acme Corp")).toHaveAttribute(
				"data-best-offer",
				"true",
			);
			expect(screen.getByText("Globex")).not.toHaveAttribute("data-best-offer");
		});
	});

	it("shows % of min offer footer row: 100% for lowest, proportional % for others", () => {
		// BASE_OFFER ongoing TC: 150k + 15k + 50k + 1.2k + 5k = 221,200
		// Higher offer (base 180k) ongoing TC: 180k + 18k + 50k + 1.2k + 5k = 254,200
		// 254,200 / 221,200 ≈ 115%
		render(
			<OfferComparisonTable
				entries={[
					makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
					makeEntry({
						job: makeJob({ id: 2, company: "Globex" }),
						offer: makeOffer({ base_pay_amount: 180_000 }),
					}),
				]}
			/>,
		);

		const pctRow = screen.getByText("% of min offer").closest("tr");
		expect(pctRow).not.toBeNull();
		const cells = within(pctRow as HTMLElement).getAllByRole("cell");
		// Cells[0] is the label cell
		expect(cells[1]).toHaveTextContent("100%");
		expect(cells[2]).toHaveTextContent("115%");
	});

	it("shows dash for % of min offer when an entry has no offer", () => {
		render(
			<OfferComparisonTable
				entries={[
					makeEntry({ job: makeJob({ id: 1 }) }),
					makeEntry({ job: makeJob({ id: 2 }), offer: null }),
				]}
			/>,
		);

		const pctRow = screen.getByText("% of min offer").closest("tr");
		expect(pctRow).not.toBeNull();
		const cells = within(pctRow as HTMLElement).getAllByRole("cell");
		expect(cells[1]).toHaveTextContent("100%");
		expect(cells[2]).toHaveTextContent("—");
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
