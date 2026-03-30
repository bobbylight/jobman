import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EndingStatusDialog from "./EndingStatusDialog";
import type { Job } from "../types";

const BASE_JOB: Job = {
	id: 1,
	company: "Acme Corp",
	role: "Engineer",
	link: "https://acme.example.com/job",
	status: "Interviewing",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: "Some existing notes",
	job_description: null,
	ending_substatus: null,
	referred_by: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
};

function changeSelect(labelText: RegExp | string, optionName: string) {
	fireEvent.mouseDown(screen.getByLabelText(labelText));
	fireEvent.click(screen.getByRole("option", { name: optionName }));
}

// Default uses Rejected/Withdrawn — the general case where the user picks a resolution
const DEFAULT_PROPS = {
	open: true,
	job: BASE_JOB,
	newStatus: "Rejected/Withdrawn" as const,
	onConfirm: vi.fn(),
	onCancel: vi.fn(),
};

describe("EndingStatusDialog", () => {
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

	it("calls onConfirm with substatus and notes when OK is clicked with valid input", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		changeSelect(/Final Resolution/i, "Rejected");
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
			"Rejected",
			"Some existing notes",
		);
	});

	it("passes null for notes when the Notes field is cleared", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		changeSelect(/Final Resolution/i, "Rejected");
		fireEvent.change(screen.getByLabelText("Notes"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith("Rejected", null);
	});

	it("calls onCancel when Cancel is clicked", () => {
		render(<EndingStatusDialog {...DEFAULT_PROPS} />);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(DEFAULT_PROPS.onCancel).toHaveBeenCalled();
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

	describe("Offer! destination", () => {
		const OFFER_PROPS = { ...DEFAULT_PROPS, newStatus: "Offer!" as const };

		it("pre-selects 'Offer accepted' when destination is Offer!", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
				"Offer accepted",
			);
		});

		it("disables the Final Resolution dropdown when destination is Offer!", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			expect(screen.getByRole("combobox")).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("calls onConfirm with 'Offer accepted' without any user selection", () => {
			render(<EndingStatusDialog {...OFFER_PROPS} />);
			fireEvent.click(screen.getByRole("button", { name: "OK" }));
			expect(DEFAULT_PROPS.onConfirm).toHaveBeenCalledWith(
				"Offer accepted",
				"Some existing notes",
			);
		});
	});
});
