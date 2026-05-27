import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import EndingStatusDialog from "./EndingStatusDialog";
import { makeJob } from "../../testUtils";

const BASE_JOB = makeJob({
	status: "Interviewing",
	notes: "Some existing notes",
});

function changeSelect(labelText: RegExp | string, optionName: string) {
	fireEvent.mouseDown(screen.getByLabelText(labelText));
	fireEvent.click(screen.getByRole("option", { name: optionName }));
}

// Default uses Rejected/Withdrawn — the general case where the user picks a resolution
const DEFAULT_PROPS = {
	job: BASE_JOB,
	newStatus: "Rejected/Withdrawn" as const,
	onCancel: vi.fn(),
	onConfirm: vi.fn(),
	open: true,
};

describe("endingStatusDialog", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the job name and destination status", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
		expect(screen.getByText(/Engineer/)).toBeInTheDocument();
		expect(screen.getByText(/Rejected\/Withdrawn/)).toBeInTheDocument();
	});

	it("pre-populates Notes with the job's existing notes", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		expect(screen.getByLabelText("Notes")).toHaveValue("Some existing notes");
	});

	it("shows Notes as empty when job has no notes", () => {
		render(
			<EndingStatusDialog
				{...DEFAULT_PROPS}
				job={{ ...BASE_JOB, notes: null }}
			/>,
		);
		expect(screen.getByLabelText("Notes")).toHaveValue("");
	});

	it("shows validation error when OK is clicked without a Final Resolution", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(screen.getByText("Required")).toBeInTheDocument();
		expect(DEFAULT_PROPS.onConfirm).not.toHaveBeenCalled();
	});

	it("calls onConfirm with substatus, notes, and null offerDate for Rejected/Withdrawn", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		changeSelect(/Final Resolution/i, "Rejected");
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
			"Rejected",
			"Some existing notes",
			null,
		);
	});

	it("passes null for notes when the Notes field is cleared", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		changeSelect(/Final Resolution/i, "Rejected");
		fireEvent.change(screen.getByLabelText("Notes"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
			"Rejected",
			null,
			null,
		);
	});

	it("calls onCancel when Cancel is clicked", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(DEFAULT_PROPS.onCancel).toHaveBeenCalledWith(expect.anything());
		expect(DEFAULT_PROPS.onConfirm).not.toHaveBeenCalled();
	});

	it("clears validation error after selecting a substatus", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(screen.getByText("Required")).toBeInTheDocument();
		changeSelect(/Final Resolution/i, "Ghosted");
		expect(screen.queryByText("Required")).not.toBeInTheDocument();
	});

	it("renders nothing meaningful when open=false", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} open={false} />);
		expect(screen.queryByText("Update Final Status")).not.toBeInTheDocument();
	});

	describe("offer! destination", () => {
		const FIXED_TODAY = "2026-05-24";
		const OFFER_PROPS = { ...DEFAULT_PROPS, newStatus: "Offer!" as const };

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date(FIXED_TODAY));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("pre-selects 'Offer accepted' when destination is Offer!", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
				"Offer accepted",
			);
		});

		it("leaves the Final Resolution dropdown enabled so the user can change it", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByRole("combobox")).not.toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("shows Offer Date field for Offer! destination", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByLabelText(/Offer Date/i)).toBeInTheDocument();
		});

		it("does not show Offer Date field for Rejected/Withdrawn", () => {
			render(<EndingStatusDialog {...DEFAULT_PROPS} />);
			expect(screen.queryByLabelText(/Offer Date/i)).not.toBeInTheDocument();
		});

		it("defaults Offer Date to today when job has no date_offer_extended", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByLabelText(/Offer Date/i)).toHaveValue(FIXED_TODAY);
		});

		it("defaults Offer Date to the job's existing date_offer_extended", () => {
			render(
				<EndingStatusDialog
					{...OFFER_PROPS}
					job={{ ...BASE_JOB, date_offer_extended: "2026-04-10" }}
				/>,
			);
			expect(screen.getByLabelText(/Offer Date/i)).toHaveValue("2026-04-10");
		});

		it("shows validation error when OK is clicked without Offer Date", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			fireEvent.change(screen.getByLabelText(/Offer Date/i), {
				target: { value: "" },
			});
			fireEvent.click(screen.getByRole("button", { name: "OK" }));
			expect(DEFAULT_PROPS.onConfirm).not.toHaveBeenCalled();
		});

		it("calls onConfirm with 'Offer accepted' and today's date when confirmed without changing defaults", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			fireEvent.click(screen.getByRole("button", { name: "OK" }));
			expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
				"Offer accepted",
				"Some existing notes",
				FIXED_TODAY,
			);
		});

		it("allows selecting 'Offer declined' and passes chosen offer date", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			changeSelect(/Final Resolution/i, "Offer declined");
			fireEvent.change(screen.getByLabelText(/Offer Date/i), {
				target: { value: "2026-05-01" },
			});
			fireEvent.click(screen.getByRole("button", { name: "OK" }));
			expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
				"Offer declined",
				"Some existing notes",
				"2026-05-01",
			);
		});

		it("only shows offer substatuses in the dropdown", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			fireEvent.mouseDown(screen.getByLabelText(/Final Resolution/i));
			expect(
				screen.getByRole("option", { name: "Offer accepted" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Offer declined" }),
			).toBeInTheDocument();
			// Rejection-only values must not appear
			expect(
				screen.queryByRole("option", { name: "Ghosted" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("option", { name: "Withdrawn" }),
			).not.toBeInTheDocument();
		});
	});

	describe("rejected/Withdrawn destination", () => {
		it("only shows rejection substatuses in the dropdown", () => {
			render(<EndingStatusDialog {...DEFAULT_PROPS} />);
			fireEvent.mouseDown(screen.getByLabelText(/Final Resolution/i));
			expect(
				screen.getByRole("option", { name: "Withdrawn" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Ghosted" }),
			).toBeInTheDocument();
			// Offer-only values must not appear
			expect(
				screen.queryByRole("option", { name: "Offer accepted" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("option", { name: "Offer declined" }),
			).not.toBeInTheDocument();
		});
	});
});
