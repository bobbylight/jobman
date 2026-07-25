import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OfferComparatorPage from "./OfferComparatorPage";
import { api } from "../../api";
import { SnackbarProvider } from "../../useSnackbar";
import { makeJob, makeJobSearch } from "../../testUtils";
import type { Offer, OfferComparisonEntry } from "../../types";

const mockNavigate = vi.fn();
vi.mock(import("react-router-dom"), async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock(import("../../api"), async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		api: { getActiveSearch: vi.fn(), getOffersComparison: vi.fn() },
	} as any;
});

vi.mock(
	import("../../useCompanyLogo"),
	() => ({ useCompanyLogo: vi.fn(() => null) }) as any,
);

vi.mock(
	import("./OfferBreakdownChart"),
	() => ({ default: () => <div data-testid="offer-breakdown-chart" /> }) as any,
);

const mockGetOffersComparison = vi.mocked(api.getOffersComparison);
const mockGetActiveSearch = vi.mocked(api.getActiveSearch);

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

function makeEntry(
	overrides: Partial<OfferComparisonEntry> = {},
): OfferComparisonEntry {
	return { job: makeJob(), offer: BASE_OFFER, ...overrides };
}

function renderPage() {
	return render(
		<SnackbarProvider>
			<MemoryRouter>
				<OfferComparatorPage />
			</MemoryRouter>
		</SnackbarProvider>,
	);
}

describe("offerComparatorPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetActiveSearch.mockResolvedValue(makeJobSearch());
	});

	it("shows a loading spinner while fetching offers", () => {
		mockGetOffersComparison.mockReturnValue(new Promise(() => {}));
		renderPage();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows an error message when the fetch fails", async () => {
		mockGetOffersComparison.mockRejectedValue(new Error("Network error"));
		renderPage();
		await waitFor(() =>
			expect(screen.getByText(/Failed to load offers/)).toBeInTheDocument(),
		);
	});

	it("shows the current-round empty state by default", async () => {
		mockGetOffersComparison.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByText("No offers in your current search."),
			).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByRole("button", { name: "Go to Kanban Board" }));
		expect(mockNavigate).toHaveBeenCalledWith("/jobs");
	});

	it("shows the all-time empty state when 'Include past rounds' is on", async () => {
		mockGetOffersComparison.mockResolvedValue([]);
		renderPage();
		await waitFor(() =>
			expect(mockGetOffersComparison).toHaveBeenCalledWith("current"),
		);

		fireEvent.click(
			screen.getByRole("switch", { name: "Include past rounds" }),
		);

		await waitFor(() =>
			expect(
				screen.getByText(/don't have any jobs in the Offer column/),
			).toBeInTheDocument(),
		);
	});

	it("renders summary cards, comparison table, and breakdown chart when offer-status jobs exist", async () => {
		mockGetOffersComparison.mockResolvedValue([
			makeEntry({ job: makeJob({ id: 1, company: "Acme Corp" }) }),
			makeEntry({ job: makeJob({ id: 2, company: "Globex" }), offer: null }),
		]);
		renderPage();

		await waitFor(() =>
			expect(screen.getAllByText("Acme Corp")).not.toHaveLength(0),
		);
		expect(screen.getAllByText("Globex").length).toBeGreaterThan(0);
		expect(screen.getByText("No offer recorded")).toBeInTheDocument();
		expect(screen.getByText("Compensation Comparison")).toBeInTheDocument();
		expect(screen.getByTestId("offer-breakdown-chart")).toBeInTheDocument();
	});

	describe("round scoping", () => {
		it("fetches with scope='current' by default", async () => {
			mockGetOffersComparison.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(mockGetOffersComparison).toHaveBeenCalledWith("current"),
			);
		});

		it("shows the active round's name as a chip next to the title", async () => {
			mockGetActiveSearch.mockResolvedValue(
				makeJobSearch({ name: "Q3 2026 Search" }),
			);
			mockGetOffersComparison.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Q3 2026 Search")).toBeInTheDocument(),
			);
		});

		it("re-fetches with scope='all' and hides the round chip when the switch is toggled on", async () => {
			mockGetActiveSearch.mockResolvedValue(
				makeJobSearch({ name: "Q3 2026 Search" }),
			);
			mockGetOffersComparison.mockResolvedValue([]);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Q3 2026 Search")).toBeInTheDocument(),
			);

			fireEvent.click(
				screen.getByRole("switch", { name: "Include past rounds" }),
			);

			await waitFor(() =>
				expect(mockGetOffersComparison).toHaveBeenCalledWith("all"),
			);
			expect(screen.queryByText("Q3 2026 Search")).not.toBeInTheDocument();
		});

		it("passes each entry's search_name through to its summary card", async () => {
			mockGetOffersComparison.mockResolvedValue([
				makeEntry({
					job: {
						...makeJob({ company: "Acme Corp" }),
						search_name: "Old Search",
					},
				}),
			]);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Old Search")).toBeInTheDocument(),
			);
		});
	});
});
