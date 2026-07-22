import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NewSearchRoundDialog from "./NewSearchRoundDialog";
import type { BlockingJob } from "../../types";

const BLOCKING_JOBS: BlockingJob[] = [
	{ id: 1, company: "Acme Corp", role: "Engineer", status: "applied" },
];

const DEFAULT_PROPS = {
	blockingJobs: null,
	onCancel: vi.fn(),
	onConfirm: vi.fn(),
	open: true,
};

describe("newSearchRoundDialog", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders nothing meaningful when open=false", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} open={false} />);
		expect(
			screen.queryByText("Start a New Job Search"),
		).not.toBeInTheDocument();
	});

	it("shows validation error when confirmed without a name", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(screen.getByText("Required")).toBeInTheDocument();
		expect(DEFAULT_PROPS.onConfirm).not.toHaveBeenCalled();
	});

	it("calls onConfirm with trimmed name and null notes when notes is blank", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} />);
		fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
			target: { value: "  Search 2  " },
		});
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith("Search 2", null);
	});

	it("calls onConfirm with notes when provided", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} />);
		fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
			target: { value: "Search 2" },
		});
		fireEvent.change(screen.getByLabelText("Notes"), {
			target: { value: "Fresh start" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
			"Search 2",
			"Fresh start",
		);
	});

	it("clears the validation error after typing a name", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		expect(screen.getByText("Required")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText(/Job Search Name/i), {
			target: { value: "Search 2" },
		});
		expect(screen.queryByText("Required")).not.toBeInTheDocument();
	});

	it("calls onCancel when Cancel is clicked", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(DEFAULT_PROPS.onCancel).toHaveBeenCalledWith(expect.anything());
	});

	describe("when blocked by unresolved jobs", () => {
		it("shows the blocking jobs instead of the form", () => {
			render(
				<NewSearchRoundDialog
					{...DEFAULT_PROPS}
					blockingJobs={BLOCKING_JOBS}
				/>,
			);
			expect(screen.getByText(/Acme Corp – Engineer/)).toBeInTheDocument();
			expect(
				screen.queryByLabelText(/Job Search Name/i),
			).not.toBeInTheDocument();
		});

		it("hides the Continue button", () => {
			render(
				<NewSearchRoundDialog
					{...DEFAULT_PROPS}
					blockingJobs={BLOCKING_JOBS}
				/>,
			);
			expect(
				screen.queryByRole("button", { name: "Continue" }),
			).not.toBeInTheDocument();
		});

		it("still allows Cancel", () => {
			render(
				<NewSearchRoundDialog
					{...DEFAULT_PROPS}
					blockingJobs={BLOCKING_JOBS}
				/>,
			);
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onCancel).toHaveBeenCalledWith(expect.anything());
		});
	});

	it("shows the form again when blockingJobs is an empty array", () => {
		render(<NewSearchRoundDialog {...DEFAULT_PROPS} blockingJobs={[]} />);
		expect(screen.getByLabelText(/Job Search Name/i)).toBeInTheDocument();
	});
});
