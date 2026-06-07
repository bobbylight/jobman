import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LeaveOfferDialog from "./LeaveOfferDialog";

const DEFAULT_PROPS = {
	company: "Acme Corp",
	onCancel: vi.fn(),
	onConfirm: vi.fn(),
	open: true,
};

describe("leaveOfferDialog", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the title and confirmation copy with the company name", () => {
		render(<LeaveOfferDialog {...DEFAULT_PROPS} />);
		expect(screen.getByText("Remove offer details?")).toBeInTheDocument();
		expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
		expect(
			screen.getByText(/permanently delete the compensation details/),
		).toBeInTheDocument();
	});

	it("calls onConfirm when Remove & Continue is clicked", () => {
		render(<LeaveOfferDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Remove & Continue" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(expect.anything());
		expect(DEFAULT_PROPS.onCancel).not.toHaveBeenCalled();
	});

	it("calls onCancel when Cancel is clicked", () => {
		render(<LeaveOfferDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(DEFAULT_PROPS.onCancel).toHaveBeenCalledWith(expect.anything());
		expect(DEFAULT_PROPS.onConfirm).not.toHaveBeenCalled();
	});

	it("renders nothing meaningful when open=false", () => {
		render(<LeaveOfferDialog {...DEFAULT_PROPS} open={false} />);
		expect(screen.queryByText("Remove offer details?")).not.toBeInTheDocument();
	});
});
