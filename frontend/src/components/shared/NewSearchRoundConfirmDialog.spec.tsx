import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NewSearchRoundConfirmDialog from "./NewSearchRoundConfirmDialog";

const DEFAULT_PROPS = {
	currentSearchName: "Search 1",
	newSearchName: "Search 2",
	onCancel: vi.fn(),
	onConfirm: vi.fn(),
	open: true,
};

describe("newSearchRoundConfirmDialog", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders nothing meaningful when open=false", () => {
		render(<NewSearchRoundConfirmDialog {...DEFAULT_PROPS} open={false} />);
		expect(screen.queryByText("Start new job search?")).not.toBeInTheDocument();
	});

	it("mentions both the current and new job search names", () => {
		render(<NewSearchRoundConfirmDialog {...DEFAULT_PROPS} />);
		expect(screen.getByText(/Search 1/)).toBeInTheDocument();
		expect(screen.getByText(/Search 2/)).toBeInTheDocument();
	});

	it("omits the current round clause when there is no active round yet", () => {
		render(
			<NewSearchRoundConfirmDialog
				{...DEFAULT_PROPS}
				currentSearchName={null}
			/>,
		);
		expect(screen.queryByText(/This closes/)).not.toBeInTheDocument();
		expect(screen.getByText(/This starts/)).toBeInTheDocument();
	});

	it("calls onConfirm when 'Start Job Search' is clicked", () => {
		render(<NewSearchRoundConfirmDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Start Job Search" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(expect.anything());
	});

	it("calls onCancel when Cancel is clicked", () => {
		render(<NewSearchRoundConfirmDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(DEFAULT_PROPS.onCancel).toHaveBeenCalledWith(expect.anything());
	});
});
