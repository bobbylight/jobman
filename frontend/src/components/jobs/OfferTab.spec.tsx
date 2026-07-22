import React from "react";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";

import OfferTab from "./OfferTab";
import { api } from "../../api";
import { SnackbarProvider } from "../../useSnackbar";
import type { Offer } from "../../types";

vi.mock(import("../../api"));

const BASE_OFFER: Offer = {
	id: 1,
	job_id: 42,
	base_pay_amount: 150_000,
	target_bonus_percent: 15,
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
	notes: "Strong offer",
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

const DEFAULT_PROPS = {
	jobId: 42,
	offerData: null as Offer | null,
	onOfferChange: vi.fn(),
};

function renderTab(props: Parameters<typeof OfferTab>[0] = DEFAULT_PROPS) {
	return render(
		<SnackbarProvider>
			<OfferTab {...props} />
		</SnackbarProvider>,
	);
}

describe("offerTab", () => {
	beforeEach(() => vi.clearAllMocks());

	describe("rendering with no existing offer", () => {
		it("renders pay and equity fields", () => {
			renderTab();
			expect(screen.getByLabelText(/Base Pay/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Target Bonus %/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Equity Amount/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Equity Vesting/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Equity Type/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Signing Bonus/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Wellness Stipend/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/401k Match %/i)).toBeInTheDocument();
		});

		it("renders other, deadline, and notes fields", () => {
			renderTab();
			expect(screen.getByLabelText(/Other Amount/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Other Label/i)).toBeInTheDocument();
			expect(
				screen.getByLabelText(/Other recurs annually/i),
			).toBeInTheDocument();
			expect(screen.getByLabelText(/Offer Deadline/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/^Notes$/i)).toBeInTheDocument();
		});

		it("renders a Save Offer button", () => {
			renderTab();
			expect(
				screen.getByRole("button", { name: "Save Offer" }),
			).toBeInTheDocument();
		});

		it("does not render a Clear button when offerData is null", () => {
			renderTab();
			expect(
				screen.queryByRole("button", { name: "Clear" }),
			).not.toBeInTheDocument();
		});

		it("initializes equity vesting years to 4", () => {
			renderTab();
			expect(screen.getByLabelText(/Equity Vesting/i)).toHaveValue(4);
		});

		it("shows the FMV info icon on the equity amount field", () => {
			renderTab();
			expect(
				screen.getByLabelText(
					"Enter total grant value at current fair market value",
				),
			).toBeInTheDocument();
		});
	});

	describe("rendering with an existing offer", () => {
		it("pre-fills fields from offerData", () => {
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });
			expect(screen.getByLabelText(/Base Pay/i)).toHaveValue(150_000);
			expect(screen.getByLabelText(/Target Bonus %/i)).toHaveValue(15);
			expect(screen.getByLabelText(/Equity Amount/i)).toHaveValue(200_000);
			expect(screen.getByLabelText(/Equity Vesting/i)).toHaveValue(4);
			expect(screen.getByLabelText(/Signing Bonus/i)).toHaveValue(20_000);
			expect(screen.getByLabelText(/Wellness Stipend/i)).toHaveValue(1200);
			expect(screen.getByLabelText(/401k Match %/i)).toHaveValue(4);
			expect(screen.getByLabelText(/^Notes$/i)).toHaveValue("Strong offer");
		});

		it("renders a Clear button when offerData is set", () => {
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });
			expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
		});
	});

	describe("save Offer — POST on first save", () => {
		it("calls createOffer when offerData is null and save is clicked", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			fireEvent.change(screen.getByLabelText(/Base Pay/i), {
				target: { value: "150000" },
			});
			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.createOffer)).toHaveBeenCalledWith(
				42,
				expect.objectContaining({ base_pay_amount: 150_000 }),
			);
		});

		it("calls onOfferChange with the saved offer after POST", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(DEFAULT_PROPS.onOfferChange).toHaveBeenCalledWith(BASE_OFFER);
		});

		it("does not call updateOffer on first save", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.updateOffer)).not.toHaveBeenCalled();
		});

		it("shows a success snackbar after saving", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			await waitFor(() => {
				expect(screen.getByText("Offer saved")).toBeInTheDocument();
			});
		});
	});

	describe("save Offer — PUT on subsequent save", () => {
		it("calls updateOffer when offerData is set and save is clicked", async () => {
			vi.mocked(api.updateOffer).mockResolvedValue(BASE_OFFER);
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.updateOffer)).toHaveBeenCalledWith(
				42,
				expect.objectContaining({ base_pay_amount: 150_000 }),
			);
		});

		it("does not call createOffer on subsequent save", async () => {
			vi.mocked(api.updateOffer).mockResolvedValue(BASE_OFFER);
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.createOffer)).not.toHaveBeenCalled();
		});
	});

	describe("clear", () => {
		it("calls deleteOffer and resets form when Clear is clicked", async () => {
			vi.mocked(api.deleteOffer).mockResolvedValue(undefined);
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Clear" }));
			});

			expect(vi.mocked(api.deleteOffer)).toHaveBeenCalledWith(42);
			expect(DEFAULT_PROPS.onOfferChange).toHaveBeenCalledWith(null);
		});

		it("clears the base pay field after Clear", async () => {
			vi.mocked(api.deleteOffer).mockResolvedValue(undefined);
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Clear" }));
			});

			expect(screen.getByLabelText(/Base Pay/i)).toHaveValue(null);
		});

		it("shows a success snackbar after clearing", async () => {
			vi.mocked(api.deleteOffer).mockResolvedValue(undefined);
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Clear" }));
			});

			await waitFor(() => {
				expect(screen.getByText("Offer cleared")).toBeInTheDocument();
			});
		});
	});

	describe("error handling", () => {
		it("shows an error snackbar when save fails", async () => {
			vi.mocked(api.createOffer).mockRejectedValue(new Error("Network error"));
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			await waitFor(() => {
				expect(
					screen.getByText("Failed to save offer. Please try again."),
				).toBeInTheDocument();
			});
		});

		it("shows an error snackbar when clear fails", async () => {
			vi.mocked(api.deleteOffer).mockRejectedValue(new Error("Network error"));
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER });

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Clear" }));
			});

			await waitFor(() => {
				expect(
					screen.getByText("Failed to clear offer. Please try again."),
				).toBeInTheDocument();
			});
		});
	});

	describe("equity type select", () => {
		it("renders RSUs as an option", () => {
			renderTab();
			fireEvent.mouseDown(screen.getByLabelText(/Equity Type/i));
			expect(screen.getByRole("option", { name: "RSUs" })).toBeInTheDocument();
		});

		it("renders all equity type options", () => {
			renderTab();
			fireEvent.mouseDown(screen.getByLabelText(/Equity Type/i));
			expect(screen.getByRole("option", { name: "RSUs" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "ISOs" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "NSOs" })).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Profit Sharing" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Phantom" }),
			).toBeInTheDocument();
		});
	});

	describe("other_is_recurring toggle", () => {
		it("is unchecked by default", () => {
			const { container } = renderTab();
			const toggle = container.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			expect(toggle).not.toBeChecked();
		});

		it("can be toggled on", () => {
			const { container } = renderTab();
			const toggle = container.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			fireEvent.click(toggle);
			expect(toggle).toBeChecked();
		});
	});

	describe("save payload", () => {
		it("includes other_is_recurring as false by default", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.createOffer)).toHaveBeenCalledWith(
				42,
				expect.objectContaining({ other_is_recurring: false }),
			);
		});

		it("includes equity_vesting_years default of 4", async () => {
			vi.mocked(api.createOffer).mockResolvedValue(BASE_OFFER);
			renderTab();

			await act(async () => {
				fireEvent.click(screen.getByRole("button", { name: "Save Offer" }));
			});

			expect(vi.mocked(api.createOffer)).toHaveBeenCalledWith(
				42,
				expect.objectContaining({ equity_vesting_years: 4 }),
			);
		});
	});

	describe("readOnly", () => {
		it("does not render Save/Clear buttons", () => {
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER, readOnly: true });
			expect(
				screen.queryByRole("button", { name: "Save Offer" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Clear" }),
			).not.toBeInTheDocument();
		});

		it("disables the Base Pay field", () => {
			renderTab({ ...DEFAULT_PROPS, offerData: BASE_OFFER, readOnly: true });
			expect(screen.getByLabelText(/Base Pay/i)).toBeDisabled();
		});
	});
});
