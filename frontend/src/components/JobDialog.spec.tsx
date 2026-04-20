import React from "react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import JobDialog from "./JobDialog";
import type { EndingSubstatus, Interview, Job, JobStatus } from "../types";
import { api } from "../api";

vi.mock(import("../api"));

vi.mock(import("./CompanyLogo"), () => ({
	default: ({ company }: { company: string }) => (
		<span
			data-testid="company-logo"
			data-company={company}
			aria-hidden="true"
		/>
	),
}));

const BASE_JOB: Job = {
	company: "Acme Corp",
	created_at: "2024-01-01T00:00:00.000Z",
	date_applied: "2024-03-01",
	date_last_onsite: null,
	date_phone_screen: null,
	ending_substatus: null,
	favorite: false,
	fit_score: "High",
	id: 42,
	job_description: null,
	link: "https://acme.example.com/job",
	notes: "Great team",
	recruiter: "Jane",
	referred_by: "Alice",
	role: "Engineer",
	salary: "$120k",
	status: "Resume submitted",
	tags: [],
	updated_at: "2024-01-01T00:00:00.000Z",
};

const MOCK_INTERVIEW: Interview = {
	id: 1,
	interview_dttm: "2024-03-12T14:00",
	interview_interviewers: "Jane Smith",
	interview_notes: null,
	interview_stage: "phone_screen",
	interview_type: null,
	interview_vibe: "casual",
	interview_result: null,
	interview_feeling: null,
	job_id: 42,
};

const terminalJob = (
	status: JobStatus,
	ending_substatus: EndingSubstatus | null,
): Job => ({ ...BASE_JOB, ending_substatus, status });

function changeSelect(labelText: RegExp | string, optionName: string) {
	fireEvent.mouseDown(screen.getByLabelText(labelText));
	fireEvent.click(screen.getByRole("option", { name: optionName }));
}

const DEFAULT_PROPS = {
	onClose: vi.fn(),
	onDelete: vi.fn(),
	onSave: vi.fn(),
	open: true,
};

/** Render in edit mode and wait for the job to finish loading. */
async function renderEditMode(job: Job = BASE_JOB) {
	const utils = render(<JobDialog {...DEFAULT_PROPS} jobId={job.id} />);
	// Wait for the form to be populated (loading finished)
	await waitFor(() => {
		expect(screen.getByLabelText(/Company/)).toHaveValue(job.company);
	});
	return utils;
}

describe(JobDialog, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.getJob).mockResolvedValue(BASE_JOB);
		vi.mocked(api.getInterviews).mockResolvedValue([]);
		vi.mocked(api.getQuestions).mockResolvedValue([]);
	});

	describe("add mode (jobId=null)", () => {
		it('shows "Add Job" as the dialog title', () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(
				screen.getByRole("heading", { name: "Add Job" }),
			).toBeInTheDocument();
		});

		it("does not show a Delete button", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(
				screen.queryByRole("button", { name: "Delete" }),
			).not.toBeInTheDocument();
		});

		it('shows an "Add Job" submit button', () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(
				screen.getByRole("button", { name: "Add Job" }),
			).toBeInTheDocument();
		});

		it("shows a text field for the link", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
		});

		it("does not show a hyperlink", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
		});

		it("shows validation errors when required fields are empty on save", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
			expect(screen.getAllByText("Required")).toHaveLength(3);
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("calls onSave with form data when all required fields are filled", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);

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
					link: "https://newco.com/job",
					role: "Developer",
				}),
			);
		});

		it("clears validation errors when the user fixes a field", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
			expect(screen.getAllByText("Required")).toHaveLength(3);

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "Acme" },
			});
			// Company error should be gone
			expect(screen.getAllByText("Required")).toHaveLength(2);
		});

		it("calls onClose when Cancel is clicked", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onClose).toHaveBeenCalledOnce();
		});

		it("does not call onClose when backdrop is clicked", () => {
			const { baseElement } = render(
				<JobDialog {...DEFAULT_PROPS} jobId={null} />,
			);
			const backdrop = baseElement.querySelector(
				".MuiBackdrop-root",
			) as HTMLElement;
			fireEvent.click(backdrop);
			expect(DEFAULT_PROPS.onClose).not.toHaveBeenCalled();
		});

		it("does not call api.getJob in add mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(vi.mocked(api.getJob)).not.toHaveBeenCalled();
		});
	});

	describe("loading state (edit mode, job not yet fetched)", () => {
		it("shows a loading spinner while fetching the job", async () => {
			// Never resolves during this test
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(
				screen.getByRole("status", { name: "Loading job" }),
			).toBeInTheDocument();
		});

		it("hides the loading spinner after the job loads", async () => {
			await renderEditMode();
			expect(
				screen.queryByRole("status", { name: "Loading job" }),
			).not.toBeInTheDocument();
		});

		it("disables the Save button while loading", async () => {
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		});

		it("disables the Delete button while loading", async () => {
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
		});

		it("keeps the Cancel button enabled while loading", async () => {
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
		});

		it("closes the dialog when Cancel is clicked during loading", async () => {
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onClose).toHaveBeenCalledOnce();
		});

		it("enables Save and Delete after job loads", async () => {
			await renderEditMode();
			expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
			expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
		});

		it("calls api.getJob with the job id", async () => {
			await renderEditMode();
			expect(vi.mocked(api.getJob)).toHaveBeenCalledWith(42);
		});
	});

	describe("error state (edit mode, job fetch failed)", () => {
		beforeEach(() => {
			vi.mocked(api.getJob).mockRejectedValue(new Error("Network error"));
		});

		it("shows an error message when the job fails to load", async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => {
				expect(screen.getByRole("alert")).toBeInTheDocument();
			});
			expect(screen.getByRole("alert")).toHaveTextContent("Failed to load job");
		});

		it("disables Save when load fails", async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => screen.getByRole("alert"));
			expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
		});

		it("disables Delete when load fails", async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => screen.getByRole("alert"));
			expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
		});

		it("keeps Cancel enabled when load fails", async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => screen.getByRole("alert"));
			expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
		});

		it("closes the dialog when Cancel is clicked after load failure", async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => screen.getByRole("alert"));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onClose).toHaveBeenCalledOnce();
		});
	});

	describe("dialog title", () => {
		it('shows "Add Job" in add mode', () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(
				screen.getByRole("heading", { name: "Add Job" }),
			).toBeInTheDocument();
		});

		it("shows company and role separated by a dash in edit mode", async () => {
			await renderEditMode();
			expect(
				screen.getByRole("heading", { name: "Acme Corp - Engineer" }),
			).toBeInTheDocument();
		});

		it("shows only the company when role is empty", async () => {
			vi.mocked(api.getJob).mockResolvedValue({ ...BASE_JOB, role: "" });
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: "Acme Corp" }),
				).toBeInTheDocument();
			});
		});

		it("renders the company logo in edit mode", async () => {
			await renderEditMode();
			const logo = screen.getByTestId("company-logo");
			expect(logo).toBeInTheDocument();
			expect(logo).toHaveAttribute("data-company", "Acme Corp");
		});

		it("does not render a company logo in add mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(screen.queryByTestId("company-logo")).not.toBeInTheDocument();
		});

		it("updates the title in real time when the company field changes", async () => {
			await renderEditMode();
			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "Globex" },
			});
			expect(
				screen.getByRole("heading", { name: "Globex - Engineer" }),
			).toBeInTheDocument();
		});

		it("updates the title in real time when the role field changes", async () => {
			await renderEditMode();
			fireEvent.change(screen.getByLabelText(/Role/), {
				target: { value: "Staff Engineer" },
			});
			expect(
				screen.getByRole("heading", { name: "Acme Corp - Staff Engineer" }),
			).toBeInTheDocument();
		});

		it("updates the logo when the company field changes", async () => {
			await renderEditMode();
			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "Globex" },
			});
			expect(screen.getByTestId("company-logo")).toHaveAttribute(
				"data-company",
				"Globex",
			);
		});
	});

	describe("edit mode (with jobId)", () => {
		it("shows company and role as the dialog title", async () => {
			await renderEditMode();
			expect(
				screen.getByRole("heading", { name: "Acme Corp - Engineer" }),
			).toBeInTheDocument();
		});

		it("pre-fills form fields after loading", async () => {
			await renderEditMode();
			expect(screen.getByLabelText(/Company/)).toHaveValue("Acme Corp");
			expect(screen.getByLabelText(/Role/)).toHaveValue("Engineer");
			// Link is shown as a hyperlink in edit mode
			expect(
				screen.getByRole("link", { name: "https://acme.example.com/job" }),
			).toHaveAttribute("href", "https://acme.example.com/job");
			expect(screen.getByLabelText(/Salary/)).toHaveValue("$120k");
			expect(screen.getByLabelText(/Recruiter/)).toHaveValue("Jane");
		});

		it("shows a Delete button", async () => {
			// Delete button is rendered immediately (disabled until load), then enabled
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
		});

		it('shows "Save" as the submit button label', async () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
		});

		it("opens a confirmation dialog when Delete is clicked after loading", async () => {
			await renderEditMode();
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));
			expect(screen.getByText("Delete job?")).toBeInTheDocument();
			expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
		});

		it("calls onDelete with the job id when deletion is confirmed", async () => {
			await renderEditMode();
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

		it("does not call onDelete when deletion is cancelled", async () => {
			await renderEditMode();
			fireEvent.click(screen.getByRole("button", { name: "Delete" }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(DEFAULT_PROPS.onDelete).not.toHaveBeenCalled();
		});

		it("calls onSave with updated form data when Save is clicked", async () => {
			await renderEditMode();

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
		it("shows the link as a hyperlink", async () => {
			await renderEditMode();
			const link = screen.getByRole("link", { name: BASE_JOB.link });
			expect(link).toHaveAttribute("href", BASE_JOB.link);
		});

		it("opens the link in a new tab", async () => {
			await renderEditMode();
			expect(screen.getByRole("link", { name: BASE_JOB.link })).toHaveAttribute(
				"target",
				"_blank",
			);
		});

		it("does not show the link text field initially", async () => {
			await renderEditMode();
			expect(
				screen.queryByPlaceholderText("https://..."),
			).not.toBeInTheDocument();
		});

		it("shows an edit button for the link", async () => {
			await renderEditMode();
			expect(
				screen.getByRole("button", { name: "Edit link" }),
			).toBeInTheDocument();
		});

		it("switches to text field when Edit link button is clicked", async () => {
			await renderEditMode();
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			const input = screen.getByPlaceholderText("https://...");
			expect(input).toBeInTheDocument();
			expect(input).toHaveValue(BASE_JOB.link);
		});

		it("hides the hyperlink after clicking Edit link", async () => {
			await renderEditMode();
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			expect(
				screen.queryByRole("link", { name: BASE_JOB.link }),
			).not.toBeInTheDocument();
		});

		it("resets to hyperlink view when modal is reopened", async () => {
			const { rerender } = await renderEditMode();

			// Switch to text field
			fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
			expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();

			// Close and reopen
			rerender(
				<JobDialog {...DEFAULT_PROPS} open={false} jobId={BASE_JOB.id} />,
			);
			rerender(<JobDialog {...DEFAULT_PROPS} open jobId={BASE_JOB.id} />);

			await waitFor(() => {
				expect(
					screen.queryByPlaceholderText("https://..."),
				).not.toBeInTheDocument();
				expect(
					screen.getByRole("link", { name: BASE_JOB.link }),
				).toBeInTheDocument();
			});
		});

		it("includes the original link value in onSave when link is not edited", async () => {
			await renderEditMode();

			fireEvent.change(screen.getByLabelText(/Company/), {
				target: { value: "New Corp" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save" }));

			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledOnce();
			const [saved] = DEFAULT_PROPS.onSave.mock.calls[0]!;
			expect(saved.link).toBe(BASE_JOB.link);
			expect(saved.company).toBe("New Corp");
		});

		it("includes updated link value when link was edited", async () => {
			await renderEditMode();

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
				render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});

			it("is disabled when editing a job with a non-terminal status", async () => {
				await renderEditMode();
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});

			it("is enabled when editing a job that already has a terminal status", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Offer!", "Offer accepted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() => {
					expect(
						screen.getByLabelText(/Final Resolution/i),
					).not.toHaveAttribute("aria-disabled");
				});
			});

			it("becomes enabled when the user changes status to a terminal value", () => {
				render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);

				changeSelect(/^Status$/i, "Rejected/Withdrawn");

				expect(screen.getByLabelText(/Final Resolution/i)).not.toHaveAttribute(
					"aria-disabled",
				);
			});

			it("becomes disabled again when status reverts from terminal to non-terminal", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Offer!", "Offer accepted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() =>
					expect(
						screen.getByLabelText(/Final Resolution/i),
					).not.toHaveAttribute("aria-disabled"),
				);
				changeSelect(/^Status$/i, "Interviewing");
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveAttribute(
					"aria-disabled",
					"true",
				);
			});
		});

		describe("auto-clear behavior", () => {
			it("clears the substatus value when status changes from terminal to non-terminal", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Offer!", "Offer accepted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() => {
					const field = screen.getByLabelText(/Final Resolution/i);
					expect(field).toHaveTextContent("Offer accepted");
				});
				const field = screen.getByLabelText(/Final Resolution/i);

				changeSelect(/^Status$/i, "Resume submitted");

				expect(field).not.toHaveTextContent("Offer accepted");
			});

			it("preserves the substatus when switching between two terminal statuses", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Offer!", "Offer accepted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() => {
					expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
						"Offer accepted",
					);
				});
				changeSelect(/^Status$/i, "Rejected/Withdrawn");
				expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
					"Offer accepted",
				);
			});
		});

		describe("pre-fill", () => {
			it("displays the existing substatus value when editing a terminal-status job", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Rejected/Withdrawn", "Ghosted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() => {
					expect(screen.getByLabelText(/Final Resolution/i)).toHaveTextContent(
						"Ghosted",
					);
				});
			});
		});

		describe("validation", () => {
			it("blocks save and shows error when terminal status has no substatus", async () => {
				vi.mocked(api.getJob).mockResolvedValue(terminalJob("Offer!", null));
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() =>
					expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
				);
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(
					screen.getByText("Required for this status"),
				).toBeInTheDocument();
				expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
			});

			it("does not show a substatus error for non-terminal status on save attempt", () => {
				render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
				fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
				expect(
					screen.queryByText("Required for this status"),
				).not.toBeInTheDocument();
			});

			it("clears the substatus error when a substatus is subsequently chosen", async () => {
				vi.mocked(api.getJob).mockResolvedValue(terminalJob("Offer!", null));
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() =>
					expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
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

			it("clears the substatus error when status changes away from terminal", async () => {
				vi.mocked(api.getJob).mockResolvedValue(terminalJob("Offer!", null));
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() =>
					expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
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
			it("includes ending_substatus in the saved data", async () => {
				vi.mocked(api.getJob).mockResolvedValue(
					terminalJob("Rejected/Withdrawn", "Ghosted"),
				);
				render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
				await waitFor(() =>
					expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
				);
				fireEvent.click(screen.getByRole("button", { name: "Save" }));
				expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
					expect.objectContaining({
						ending_substatus: "Ghosted",
						status: "Rejected/Withdrawn",
					}),
				);
			});

			it("sends ending_substatus as null for non-terminal status jobs", () => {
				render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
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

	describe("tags", () => {
		it("renders a Tags autocomplete input", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(screen.getByLabelText("Tags")).toBeInTheDocument();
		});

		it("pre-fills selected tags as chips from loaded job", async () => {
			vi.mocked(api.getJob).mockResolvedValue({
				...BASE_JOB,
				tags: ["remote", "faang"],
			});
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /Remote/ }),
				).toBeInTheDocument();
			});
			expect(screen.getByRole("button", { name: /FAANG/ })).toBeInTheDocument();
		});

		it("pre-fills tags in onSave payload", async () => {
			vi.mocked(api.getJob).mockResolvedValue({
				...BASE_JOB,
				tags: ["remote", "faang"],
			});
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			await waitFor(() =>
				expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(),
			);
			fireEvent.click(screen.getByRole("button", { name: "Save" }));
			expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					tags: expect.arrayContaining(["remote", "faang"]),
				}),
			);
		});

		it("includes empty tags array in onSave when no tags are selected", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
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
				expect.objectContaining({ tags: [] }),
			);
		});
	});

	describe("tabs", () => {
		it("does not show tabs in add mode", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			expect(screen.queryByRole("tab")).not.toBeInTheDocument();
		});

		it("shows Details and Interviews tabs in edit mode after loading", async () => {
			await renderEditMode();
			expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
			expect(
				screen.getByRole("tab", { name: "Interviews" }),
			).toBeInTheDocument();
		});

		it("does not show tabs while loading", async () => {
			vi.mocked(api.getJob).mockReturnValue(new Promise(() => {}));
			render(<JobDialog {...DEFAULT_PROPS} jobId={42} />);
			expect(screen.queryByRole("tab")).not.toBeInTheDocument();
		});

		it("starts on the Details tab in edit mode", async () => {
			await renderEditMode();
			expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		it("shows Save and Delete buttons on the Details tab", async () => {
			await renderEditMode();
			expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
		});

		it("hides Save and Delete and shows Close when on the Interviews tab", async () => {
			await renderEditMode();
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
			await renderEditMode();
			fireEvent.click(screen.getByRole("tab", { name: "Interviews" }));
			await waitFor(() => {
				expect(
					screen.getByRole("tab", { name: "Interviews (1)" }),
				).toBeInTheDocument();
			});
		});

		it("resets to Details tab when the dialog is reopened", async () => {
			const { rerender } = await renderEditMode();
			fireEvent.click(screen.getByRole("tab", { name: "Interviews" }));
			await waitFor(() => screen.getByRole("tab", { name: "Interviews" }));

			rerender(
				<JobDialog {...DEFAULT_PROPS} open={false} jobId={BASE_JOB.id} />,
			);
			rerender(<JobDialog {...DEFAULT_PROPS} open jobId={BASE_JOB.id} />);

			await waitFor(() => {
				expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
					"aria-selected",
					"true",
				);
			});
		});
	});

	describe("field length validation", () => {
		function fillRequiredFields() {
			fireEvent.change(screen.getByLabelText(/Company \*/i), {
				target: { value: "Acme" },
			});
			fireEvent.change(screen.getByLabelText(/Role \*/i), {
				target: { value: "Engineer" },
			});
			fireEvent.change(screen.getByPlaceholderText("https://..."), {
				target: { value: "https://example.com" },
			});
		}

		function clickSave() {
			fireEvent.click(screen.getByRole("button", { name: "Add Job" }));
		}

		it("shows an error when company exceeds 128 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByLabelText(/Company \*/i), {
				target: { value: "a".repeat(129) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 128 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("shows an error when role exceeds 256 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByLabelText(/Role \*/i), {
				target: { value: "a".repeat(257) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 256 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("shows an error when link exceeds 4096 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByPlaceholderText("https://..."), {
				target: { value: "a".repeat(4097) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 4,096 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("shows an error when salary exceeds 64 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByLabelText(/Salary/i), {
				target: { value: "a".repeat(65) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 64 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("shows an error when recruiter exceeds 128 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByLabelText(/Recruiter/i), {
				target: { value: "a".repeat(129) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 128 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("shows an error when referred_by exceeds 128 characters", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			fireEvent.change(screen.getByLabelText(/Referred By/i), {
				target: { value: "a".repeat(129) },
			});
			clickSave();
			expect(
				screen.getByText("Must be 128 characters or fewer"),
			).toBeInTheDocument();
			expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
		});

		it("calls onSave when all fields are within limits", () => {
			render(<JobDialog {...DEFAULT_PROPS} jobId={null} />);
			fillRequiredFields();
			clickSave();
			expect(DEFAULT_PROPS.onSave).toHaveBeenCalled();
		});
	});
});
