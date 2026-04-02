import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import JobDialog from "./JobDialog";
import type { Job, JobStatus, EndingSubstatus, Interview } from "../types";
import { api } from "../api";

vi.mock("../api");

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
	job_description: null,
	ending_substatus: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
};

const MOCK_INTERVIEW: Interview = {
	id: 1,
	job_id: 42,
	interview_type: "phone_screen",
	interview_dttm: "2024-03-12T14:00",
	interview_interviewers: "Jane Smith",
	interview_vibe: "casual",
	interview_notes: null,
};

const terminalJob = (
	status: JobStatus,
	ending_substatus: EndingSubstatus | null,
): Job => ({ ...BASE_JOB, status, ending_substatus });

function changeSelect(labelText: RegExp | string, optionName: string) {
	fireEvent.mouseDown(screen.getByLabelText(labelText));
	fireEvent.click(screen.getByRole("option", { name: optionName }));
}

const DEFAULT_PROPS = {
	open: true,
	onClose: vi.fn(),
	onSave: vi.fn(),
	onDelete: vi.fn(),
};

describe("JobDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.getInterviews).mockResolvedValue([]);
	});

	describe("add mode (no initialValues)", () => {
		it('shows "Add Job" as the dialog title', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(
				screen.getByRole("heading", { name: "Add Job" }),
			).toBeInTheDocument();
		});

		it("does not show a Delete button", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(
				screen.queryByRole("button", { name: "Delete" }),
			).not.toBeInTheDocument();
		});

		it('shows an "Add Job" submit button', () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(
				screen.getByRole("button", { name: "Add Job" }),
			).toBeInTheDocument();
		});

		it("shows a text field for the link", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
		});

		it("does not show a hyperlink", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
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
			expect(
				screen.getByRole("heading", { name: "Edit Job" }),
			).toBeInTheDocument();
		});

		it("pre-fills form fields with initialValues", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByLabelText(/Company/)).toHaveValue("Acme Corp");
			expect(screen.getByLabelText(/Role/)).toHaveValue("Engineer");
			// Link is shown as a hyperlink in edit mode
			expect(
				screen.getByRole("link", { name: "https://acme.example.com/job" }),
			).toHaveAttribute("href", "https://acme.example.com/job");
			expect(screen.getByLabelText(/Salary/)).toHaveValue("$120k");
			expect(screen.getByLabelText(/Recruiter/)).toHaveValue("Jane");
		});

		it("shows a Delete button", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
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
			const confirmDialog = screen
				.getByText("Delete job?")
				.closest('[role="dialog"]') as HTMLElement;
			fireEvent.click(
				within(confirmDialog).getByRole("button", { name: "Delete" }),
			);

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

	describe("link field (edit mode)", () => {
		it("shows the link as a hyperlink", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			const link = screen.getByRole("link", { name: BASE_JOB.link });
			expect(link).toHaveAttribute("href", BASE_JOB.link);
		});

		it("opens the link in a new tab", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("link", { name: BASE_JOB.link })).toHaveAttribute(
				"target",
				"_blank",
			);
		});

		it("does not show the link text field initially", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(
				screen.queryByPlaceholderText("https://..."),
			).not.toBeInTheDocument();
		});

		it("shows an edit button for the link", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(
				screen.getByRole("button", { name: "Edit link" }),
			).toBeInTheDocument();
		});

		it("switches to text field when Edit link button is clicked", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			const input = screen.getByPlaceholderText("https://...");
			expect(input).toBeInTheDocument();
			expect(input).toHaveValue(BASE_JOB.link);
		});

		it("hides the hyperlink after clicking Edit link", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			expect(
				screen.queryByRole("link", { name: BASE_JOB.link }),
			).not.toBeInTheDocument();
		});

		it("resets to hyperlink view when modal is reopened", async () => {
			const { rerender } = render(
				<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />,
			);

			// Switch to text field
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();

			// Close and reopen
			rerender(
				<JobDialog {...DEFAULT_PROPS} open={false} initialValues={BASE_JOB} />,
			);
			rerender(<JobDialog {...DEFAULT_PROPS} open initialValues={BASE_JOB} />);

			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("https://..."),
				).not.toBeInTheDocument();
				expect(
					screen.getByRole("link", { name: BASE_JOB.link }),
				).toBeInTheDocument();
			});
		});

		it("includes the original link value in onSave when link is not edited", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "New Corp" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save" }));

			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledOnce();
			const saved = DEFAULT_PROPS.onSave.mock.calls[0]![0];
			expect(saved.link).toBe(BASE_JOB.link);
			expect(saved.company).toBe("New Corp");
		});

		it("includes updated link value when link was edited", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);

			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			fireEvent.change(screen.getByPlaceholderText("https://..."), {
				target: { value: "https://newjob.example.com" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save" }));

			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledOnce();
			expect(DEFAULT_PROPS.onSave.mock.calls[0]![0].link).toBe(
				"https://newjob.example.com",
			);
		});
	});

	describe("Final Resolution field (ending_substatus)", () => {
		describe("disabled state", () => {
			it("is disabled for a new job (non-terminal default status)", () => {
				render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});

			it("is disabled when editing a job with a non-terminal status", () => {
				render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});

			it("is enabled when editing a job that already has a terminal status", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", "Offer accepted")}
					/>,
				);
				expect(screen.getByLabelText(/Final Resolution/i)).not.toHaveAttribute(
					"aria-disabled",
				);
			});

			it("becomes enabled when the user changes status to a terminal value", () => {
				render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);

				changeSelect(/^Status$/i, "Rejected/Withdrawn");

				expect(screen.getByLabelText(/Final Resolution/i)).not.toHaveAttribute(
					"aria-disabled",
				);
			});

			it("becomes disabled again when status reverts from terminal to non-terminal", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", "Offer accepted")}
					/>,
				);
				changeSelect(/^Status$/i, "Interviewing");
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});
		});

		describe("auto-clear behavior", () => {
			it("clears the substatus value when status changes from terminal to non-terminal", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", "Offer accepted")}
					/>,
				);
				const field = screen.getByLabelText(/Final Resolution/i);
				expect(field).toHaveTextContent("Offer accepted");

				changeSelect(/^Status$/i, "Resume submitted");

				expect(field).not.toHaveTextContent("Offer accepted");
			});

			it("preserves the substatus when switching between two terminal statuses", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", "Offer accepted")}
					/>,
				);
				changeSelect(/^Status$/i, "Rejected/Withdrawn");
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
					"Offer accepted",
				);
			});
		});

		describe("pre-fill", () => {
			it("displays the existing substatus value when editing a terminal-status job", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Rejected/Withdrawn", "Ghosted")}
					/>,
				);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
					"Ghosted",
				);
			});
		});

		describe("validation", () => {
			it("blocks save and shows error when terminal status has no substatus", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", null)}
					/>,
				);
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(
					screen.getByText("Required for this status"),
				).toBeInTheDocument();
				expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
			});

			it("does not show a substatus error for non-terminal status on save attempt", () => {
				render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
				fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
				expect(
					screen.queryByText("Required for this status"),
				).not.toBeInTheDocument();
			});

			it("clears the substatus error when a substatus is subsequently chosen", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", null)}
					/>,
				);
				// Trigger the error
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(
					screen.getByText("Required for this status"),
				).toBeInTheDocument();

				// Pick a substatus
				changeSelect(/Final Resolution/i, "Offer accepted");

				expect(
					screen.queryByText("Required for this status"),
				).not.toBeInTheDocument();
			});

			it("clears the substatus error when status changes away from terminal", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Offer!", null)}
					/>,
				);
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(
					screen.getByText("Required for this status"),
				).toBeInTheDocument();

				changeSelect(/^Status$/i, "Phone screen");

				expect(
					screen.queryByText("Required for this status"),
				).not.toBeInTheDocument();
			});
		});

		describe("onSave payload", () => {
			it("includes ending_substatus in the saved data", () => {
				render(
					<JobDialog
						{...DEFAULT_PROPS}
						initialValues={terminalJob("Rejected/Withdrawn", "Ghosted")}
					/>,
				);
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
					expect.objectContaining({
						status: "Rejected/Withdrawn",
						ending_substatus: "Ghosted",
					}),
				);
			});

			it("sends ending_substatus as null for non-terminal status jobs", () => {
				render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
				fireEvent.change(screen.getByLabelText(/Company/), {
					target: { value: "X" },
				});
				fireEvent.change(screen.getByLabelText(/Role/), {
					target: { value: "Y" },
				});
				fireEvent.change(screen.getByLabelText(/Link/), {
					target: { value: "https://x.com" },
				});
				fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
				expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
					expect.objectContaining({ ending_substatus: null }),
				);
			});
		});
	});

	describe("tabs", () => {
		it("does not show tabs in add mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={null} />);
			expect(screen.queryByRole("tab")).not.toBeInTheDocument();
		});

		it("shows Details and Interviews tabs in edit mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
			expect(
				screen.getByRole("tab", { name: "Interviews" }),
			).toBeInTheDocument();
		});

		it("starts on the Details tab in edit mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		it("shows Save and Delete buttons on the Details tab", () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
		});

		it("hides Save and Delete and shows Close when on the Interviews tab", async () => {
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("tab", { name: "Interviews" }));
			await waitFor(() => {
				expect(
					screen.queryByRole("button", { name: "Save" }),
				).not.toBeInTheDocument();
				expect(
					screen.queryByRole("button", { name: "Delete" }),
				).not.toBeInTheDocument();
				expect(
					screen.getByRole("button", { name: "Close" }),
				).toBeInTheDocument();
			});
		});

		it("updates the Interviews tab label with the count after loading", async () => {
			vi.mocked(api.getInterviews).mockResolvedValue([MOCK_INTERVIEW]);
			render(<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />);
			fireEvent.click(screen.getByRole("tab", { name: "Interviews" }));
			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Interviews (1)" }),
				).toBeInTheDocument();
			});
		});

		it("resets to Details tab when the dialog is reopened", async () => {
			const { rerender } = render(
				<JobDialog {...DEFAULT_PROPS} initialValues={BASE_JOB} />,
			);
			fireEvent.click(screen.getByRole("tab", { name: "Interviews" }));
			await waitFor(() => screen.getByRole("tab", { name: "Interviews" }));

			rerender(
				<JobDialog {...DEFAULT_PROPS} open={false} initialValues={BASE_JOB} />,
			);
			rerender(<JobDialog {...DEFAULT_PROPS} open initialValues={BASE_JOB} />);

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
					"aria-selected",
					"true",
				);
			});
		});
	});
});
