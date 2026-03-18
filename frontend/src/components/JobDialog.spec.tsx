import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import JobDialog from "./JobDialog";
import type { Job } from "../types";

const BASE_JOB: Job = {
	id: 42,
	company: "Acme Corp",
	role: "Engineer",
	link: "https://acme.example.com/job",
	status: "Resume submitted",
	fit_score: "High",
	salary: "$120k",
	date_applied: "2024-03-01",
	recruiter: "Jane",
	notes: "Great team",
	referred_by: "Alice",
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
};

const DEFAULT_PROPS = {
	open: true,
	onClose: vi.fn(),
	onSave: vi.fn(),
	onDelete: vi.fn(),
};

describe("JobDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("add mode (no initialValues)", () => {
		it('shows "Add Job" as the dialog title', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.getByRole("heading", { name: "Add Job" })).toBeInTheDocument();
		});

		it("does not show a Delete button", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
		});

		it('shows an "Add Job" submit button', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.getByRole("button", { name: "Add Job" })).toBeInTheDocument();
		});

		it("shows validation errors when required fields are empty on save", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
			expect(screen.getAllByText("Required")).toHaveLength(3);
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("calls onSave with form data when all required fields are filled", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "New Co" },
			});
			fireEvent.change(screen.getByLabelText(/Role/), {
				target: { value: "Developer" },
			});
			fireEvent.change(screen.getByLabelText(/Link/), {
				target: { value: "https://newco.com/job" },
			});

			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));

			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					company: "New Co",
					role: "Developer",
					link: "https://newco.com/job",
				}),
			);
		});

		it("clears validation errors when the user fixes a field", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
			expect(screen.getAllByText("Required")).toHaveLength(3);

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "Acme" },
			});
			// Company error should be gone
			expect(screen.getAllByText("Required")).toHaveLength(2);
		});

		it("calls onClose when Cancel is clicked", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("edit mode (with initialValues)", () => {
		it('shows "Edit Job" as the dialog title', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("heading", { name: "Edit Job" })).toBeInTheDocument();
		});

		it("pre-fills form fields with initialValues", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByLabelText(/Company/)).toHaveValue("Acme Corp");
			expect(screen.getByLabelText(/Role/)).toHaveValue("Engineer");
			expect(screen.getByLabelText(/Link/)).toHaveValue("https://acme.example.com/job");
			expect(screen.getByLabelText(/Salary/)).toHaveValue("$120k");
			expect(screen.getByLabelText(/Recruiter/)).toHaveValue("Jane");
		});

		it("shows a Delete button", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
		});

		it('shows "Save" as the submit button label', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
		});

		it("opens a confirmation dialog when Delete is clicked", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));
			expect(screen.getByText("Delete job?")).toBeInTheDocument();
			expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
		});

		it("calls onDelete with the job id when deletion is confirmed", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));

			// Click the confirm Delete button inside the confirmation dialog
			const confirmDialog = screen.getByText("Delete job?").closest('[role="dialog"]')!;
			fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete" }));

			expect(DEFAULT_PROPS.onDelete).toHaveBeenCalledWith(42);
		});

		it("does not call onDelete when deletion is cancelled", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onDelete).not.toHaveBeenCalled();
		});

		it("calls onSave with updated form data when Save is clicked", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "Updated Corp" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save" }));

			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
				expect.objectContaining({ company: "Updated Corp" }),
			);
		});
	});
});
