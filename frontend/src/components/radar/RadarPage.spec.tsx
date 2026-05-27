import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RadarPage from "./RadarPage";
import { api } from "../../api";
import type { RadarEntry, RadarPolicy, RadarResponse } from "../../types";

vi.mock(
	import("../../api"),
	() =>
		({
			api: {
				getRadar: vi.fn(),
				patchRadarEntry: vi.fn(),
			},
		}) as any,
);

vi.mock(
	import("../../useCompanyLogo"),
	() => ({ useCompanyLogo: vi.fn(() => null) }) as any,
);

const mockGetRadar = vi.mocked(api.getRadar);
const mockPatch = vi.mocked(api.patchRadarEntry);

const EMPTY_POLICY: RadarPolicy = {
	application_cooldown_days: null,
	apps_period_days: null,
	confidence: null,
	max_apps_per_period: null,
	onsite_cooldown_days: null,
	phone_screen_cooldown_days: null,
	summary: null,
	updated_at: null,
	url: null,
};

function makeEntry(overrides: Partial<RadarEntry> = {}): RadarEntry {
	return {
		active_job_id: null,
		days_until_unlock: null,
		eligibility: "clear",
		hidden: false,
		id: 1,
		jobs: [],
		last_application_date: "2025-01-01",
		last_interview_date: null,
		latest_active_status: null,
		name: "Acme",
		policy: EMPTY_POLICY,
		tier: "faang",
		unlock_date: null,
		user_notes: null,
		...overrides,
	};
}

function makeResponse(entries: RadarEntry[]): RadarResponse {
	return { entries, generated_at: "2026-05-24T00:00:00.000Z" };
}

function renderPage() {
	return render(
		<MemoryRouter>
			<RadarPage />
		</MemoryRouter>,
	);
}

describe(RadarPage, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPatch.mockResolvedValue({ success: true });
	});

	describe("loading and error states", () => {
		it("shows a loading spinner while fetching", () => {
			mockGetRadar.mockReturnValue(new Promise(() => {}));
			renderPage();
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("hides the spinner after data loads", async () => {
			mockGetRadar.mockResolvedValue(makeResponse([]));
			renderPage();
			await waitFor(() =>
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
			);
		});

		it("shows an error message when the fetch fails", async () => {
			mockGetRadar.mockRejectedValue(new Error("Network error"));
			renderPage();
			await waitFor(() =>
				expect(
					screen.getByText(/Failed to load radar data/),
				).toBeInTheDocument(),
			);
		});

		it("calls getRadar(false) on mount", async () => {
			mockGetRadar.mockResolvedValue(makeResponse([]));
			renderPage();
			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledWith(false));
		});
	});

	describe("page structure", () => {
		it("shows the FAANG Radar heading", () => {
			mockGetRadar.mockReturnValue(new Promise(() => {}));
			renderPage();
			expect(
				screen.getByRole("heading", { name: "FAANG Radar" }),
			).toBeInTheDocument();
		});

		it("renders a row for each entry after loading", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([
					makeEntry({ id: 1, name: "Google" }),
					makeEntry({ id: 2, name: "Meta" }),
				]),
			);
			renderPage();
			await waitFor(() => {
				expect(screen.getByText("Google")).toBeInTheDocument();
				expect(screen.getByText("Meta")).toBeInTheDocument();
			});
		});

		it("shows correct summary chip counts", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([
					makeEntry({ id: 1, eligibility: "active" }),
					makeEntry({
						id: 2,
						eligibility: "cooling_down",
						days_until_unlock: 5,
						unlock_date: "2026-06-01",
					}),
					makeEntry({ id: 3, eligibility: "clear" }),
					makeEntry({ id: 4, eligibility: "no_history" }),
					makeEntry({ id: 5, eligibility: "limit_reached" }),
				]),
			);
			renderPage();
			await waitFor(() => {
				expect(screen.getByText("Active: 1")).toBeInTheDocument();
				expect(screen.getByText("App Limit: 1")).toBeInTheDocument();
				expect(screen.getByText("Cooling Down: 1")).toBeInTheDocument();
				expect(screen.getByText("Clear: 1")).toBeInTheDocument();
				expect(screen.getByText("No History: 1")).toBeInTheDocument();
			});
		});
	});

	describe("eligibility chip labels", () => {
		it("shows the correct chip label for each eligibility status", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([
					makeEntry({ id: 1, name: "Google", eligibility: "active" }),
					makeEntry({
						id: 2,
						name: "Meta",
						eligibility: "cooling_down",
						days_until_unlock: 20,
						unlock_date: "2026-06-10",
					}),
					makeEntry({ id: 3, name: "Apple", eligibility: "clear" }),
					makeEntry({ id: 4, name: "Amazon", eligibility: "no_history" }),
					makeEntry({
						id: 5,
						name: "Netflix",
						eligibility: "limit_reached",
						days_until_unlock: 10,
						unlock_date: "2026-06-01",
					}),
				]),
			);
			renderPage();
			await waitFor(() => {
				expect(screen.getByText("Active Pipeline")).toBeInTheDocument();
				expect(screen.getByText("Unlock in 20d")).toBeInTheDocument();
				expect(screen.getByText("Clear to Apply")).toBeInTheDocument();
				expect(screen.getByText("No History")).toBeInTheDocument();
				expect(screen.getByText(/App Limit.*slot in 10d/)).toBeInTheDocument();
			});
		});
	});

	describe("tab filtering", () => {
		const MULTI_ENTRY_RESPONSE = makeResponse([
			makeEntry({ id: 1, name: "Google", eligibility: "active" }),
			makeEntry({
				id: 2,
				name: "Meta",
				eligibility: "cooling_down",
				days_until_unlock: 5,
				unlock_date: "2026-06-01",
			}),
			makeEntry({ id: 3, name: "Apple", eligibility: "clear" }),
			makeEntry({ id: 4, name: "Amazon", eligibility: "no_history" }),
			makeEntry({
				id: 5,
				name: "Netflix",
				eligibility: "limit_reached",
				days_until_unlock: 3,
				unlock_date: "2026-05-27",
			}),
		]);

		it("All tab (default) renders every entry", async () => {
			mockGetRadar.mockResolvedValue(MULTI_ENTRY_RESPONSE);
			renderPage();
			await waitFor(() =>
				expect(screen.getByText("Google")).toBeInTheDocument(),
			);
			expect(screen.getByText("Meta")).toBeInTheDocument();
			expect(screen.getByText("Apple")).toBeInTheDocument();
			expect(screen.getByText("Amazon")).toBeInTheDocument();
			expect(screen.getByText("Netflix")).toBeInTheDocument();
		});

		it("Eligible Now tab shows only clear and no_history entries", async () => {
			mockGetRadar.mockResolvedValue(MULTI_ENTRY_RESPONSE);
			renderPage();
			await waitFor(() => screen.getByText("Google"));

			fireEvent.click(screen.getByRole("tab", { name: /Eligible Now/i }));

			expect(screen.getByText("Apple")).toBeInTheDocument();
			expect(screen.getByText("Amazon")).toBeInTheDocument();
			expect(screen.queryByText("Google")).not.toBeInTheDocument();
			expect(screen.queryByText("Meta")).not.toBeInTheDocument();
			expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
		});

		it("Active tab shows only active and limit_reached entries", async () => {
			mockGetRadar.mockResolvedValue(MULTI_ENTRY_RESPONSE);
			renderPage();
			await waitFor(() => screen.getByText("Google"));

			fireEvent.click(screen.getByRole("tab", { name: /^Active \(/ }));

			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByText("Netflix")).toBeInTheDocument();
			expect(screen.queryByText("Meta")).not.toBeInTheDocument();
			expect(screen.queryByText("Apple")).not.toBeInTheDocument();
			expect(screen.queryByText("Amazon")).not.toBeInTheDocument();
		});

		it("On Cooldown tab shows only cooling_down entries", async () => {
			mockGetRadar.mockResolvedValue(MULTI_ENTRY_RESPONSE);
			renderPage();
			await waitFor(() => screen.getByText("Google"));

			fireEvent.click(screen.getByRole("tab", { name: /On Cooldown/i }));

			expect(screen.getByText("Meta")).toBeInTheDocument();
			expect(screen.queryByText("Google")).not.toBeInTheDocument();
			expect(screen.queryByText("Apple")).not.toBeInTheDocument();
		});

		it("shows 'No companies match this filter.' when the tab has no matching entries", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([
					makeEntry({ id: 1, name: "Apple", eligibility: "clear" }),
				]),
			);
			renderPage();
			await waitFor(() => screen.getByText("Apple"));

			fireEvent.click(screen.getByRole("tab", { name: /^Active \(/ }));

			expect(
				screen.getByText("No companies match this filter."),
			).toBeInTheDocument();
		});
	});

	describe("show hidden toggle", () => {
		it("calls getRadar(true) when Show hidden is toggled on", async () => {
			mockGetRadar.mockResolvedValue(makeResponse([]));
			renderPage();
			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledWith(false));

			mockGetRadar.mockResolvedValue(makeResponse([]));
			fireEvent.click(screen.getByText("Show hidden"));

			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledWith(true));
		});

		it("calls getRadar(false) when Show hidden is toggled back off", async () => {
			mockGetRadar.mockResolvedValue(makeResponse([]));
			renderPage();
			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledWith(false));

			mockGetRadar.mockResolvedValue(makeResponse([]));
			const toggle = screen.getByText("Show hidden");
			fireEvent.click(toggle); // On
			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledWith(true));

			mockGetRadar.mockResolvedValue(makeResponse([]));
			fireEvent.click(toggle); // Off
			await waitFor(() => expect(mockGetRadar).toHaveBeenLastCalledWith(false));
		});
	});

	describe("row interactions", () => {
		it("saves user notes on blur when the value has changed", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([makeEntry({ id: 7, user_notes: null })]),
			);
			renderPage();
			await waitFor(() => screen.getByText("Acme"));
			fireEvent.click(screen.getByText("Acme"));

			const notesField = screen.getByRole("textbox", { name: /^Notes$/i });
			fireEvent.change(notesField, { target: { value: "Great company" } });
			fireEvent.blur(notesField);

			expect(mockPatch).toHaveBeenCalledWith(7, {
				user_notes: "Great company",
			});
		});

		it("does not call patchRadarEntry on blur if notes are unchanged", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([makeEntry({ id: 7, user_notes: "Existing note" })]),
			);
			renderPage();
			await waitFor(() => screen.getByText("Acme"));
			fireEvent.click(screen.getByText("Acme"));

			const notesField = screen.getByRole("textbox", { name: /^Notes$/i });
			fireEvent.blur(notesField);

			expect(mockPatch).not.toHaveBeenCalled();
		});

		it("calls patchRadarEntry with { hidden: 1 } when the hide switch is toggled", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([makeEntry({ id: 3, hidden: false })]),
			);
			renderPage();
			await waitFor(() => screen.getByText("Acme"));
			fireEvent.click(screen.getByText("Acme"));

			fireEvent.click(screen.getByText("Hide from radar"));

			expect(mockPatch).toHaveBeenCalledWith(3, { hidden: 1 });
		});

		it("calls patchRadarEntry with { hidden: 0 } when Restore to radar is clicked", async () => {
			const hiddenEntry = makeEntry({ id: 4, name: "Hidden Co", hidden: true });
			mockGetRadar.mockResolvedValue(makeResponse([hiddenEntry]));
			renderPage();
			await waitFor(() => screen.getByText("Hidden Co"));

			// Expand the row to reveal the Restore button inside the Collapse
			fireEvent.click(screen.getByText("Hidden Co"));

			const [restoreBtn] = screen.getAllByRole("button", {
				name: /restore to radar/i,
			});
			fireEvent.click(restoreBtn!);

			expect(mockPatch).toHaveBeenCalledWith(4, { hidden: 0 });
		});

		it("re-fetches radar data after a hidden status change", async () => {
			mockGetRadar.mockResolvedValue(
				makeResponse([makeEntry({ id: 3, hidden: false })]),
			);
			renderPage();
			await waitFor(() => screen.getByText("Acme"));
			fireEvent.click(screen.getByText("Acme"));

			mockGetRadar.mockResolvedValue(makeResponse([]));
			fireEvent.click(screen.getByText("Hide from radar"));
			await waitFor(() => mockPatch.mock.calls.length > 0);

			await waitFor(() => expect(mockGetRadar).toHaveBeenCalledTimes(2));
		});
	});
});
