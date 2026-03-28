import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobDialog from "./JobDialog";
import type { Job } from "../types";

const baseJob: Job = {
	id: 1,
	company: "Acme Corp",
	role: "Engineer",
	link: "https://example.com/job/123",
	status: "Not started",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: null,
	referred_by: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2025-01-01T00:00:00",
	updated_at: "2025-01-01T00:00:00",
};

function renderDialog({
	initialValues = null,
	onSave = vi.fn(),
	onDelete = vi.fn(),
	onClose = vi.fn(),
}: {
	initialValues?: Job | null;
	onSave?: ReturnType<typeof vi.fn>;
	onDelete?: ReturnType<typeof vi.fn>;
	onClose?: ReturnType<typeof vi.fn>;
} = {}) {
	return render(
		<JobDialog
			open
			onClose={onClose}
			onSave={onSave}
			onDelete={onDelete}
			initialValues={initialValues}
		/>,
	);
}

describe("JobDialog — Link field (Add mode)", () => {
	it("shows a text field for the link in Add mode", () => {
		renderDialog();
		expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
	});

	it("does not show a hyperlink in Add mode", () => {
		renderDialog();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});

describe("JobDialog — Link field (Edit mode)", () => {
	it("shows the link as a hyperlink in Edit mode", () => {
		renderDialog({ initialValues: baseJob });
		const link = screen.getByRole("link", { name: baseJob.link });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", baseJob.link);
	});

	it("opens the link in a new tab", () => {
		renderDialog({ initialValues: baseJob });
		const link = screen.getByRole("link", { name: baseJob.link });
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("does not show the link text field initially in Edit mode", () => {
		renderDialog({ initialValues: baseJob });
		expect(
			screen.queryByPlaceholderText("https://..."),
		).not.toBeInTheDocument();
	});

	it("shows an edit button for the link in Edit mode", () => {
		renderDialog({ initialValues: baseJob });
		expect(
			screen.getByRole("button", { name: "Edit link" }),
		).toBeInTheDocument();
	});

	it("switches to text field when Edit link button is clicked", async () => {
		renderDialog({ initialValues: baseJob });
		await userEvent.click(screen.getByRole("button", { name: "Edit link" }));
		const input = screen.getByPlaceholderText("https://...");
		expect(input).toBeInTheDocument();
		expect(input).toHaveValue(baseJob.link);
	});

	it("hides the hyperlink after clicking Edit link", async () => {
		renderDialog({ initialValues: baseJob });
		await userEvent.click(screen.getByRole("button", { name: "Edit link" }));
		expect(
			screen.queryByRole("link", { name: baseJob.link }),
		).not.toBeInTheDocument();
	});

	it("resets to hyperlink view when modal is reopened", async () => {
		const { rerender } = render(
			<JobDialog
				open
				onClose={vi.fn()}
				onSave={vi.fn()}
				onDelete={vi.fn()}
				initialValues={baseJob}
			/>,
		);

		// Click edit to switch to text field
		await userEvent.click(screen.getByRole("button", { name: "Edit link" }));
		expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();

		// Close and reopen
		rerender(
			<JobDialog
				open={false}
				onClose={vi.fn()}
				onSave={vi.fn()}
				onDelete={vi.fn()}
				initialValues={baseJob}
			/>,
		);
		rerender(
			<JobDialog
				open
				onClose={vi.fn()}
				onSave={vi.fn()}
				onDelete={vi.fn()}
				initialValues={baseJob}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.queryByPlaceholderText("https://..."),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: baseJob.link }),
			).toBeInTheDocument();
		});
	});
});

describe("JobDialog — Edit mode saves link when not editing it", () => {
	it("includes the original link value in onSave when link is not edited", async () => {
		const onSave = vi.fn();
		renderDialog({ initialValues: baseJob, onSave });

		// Change another field without touching the link
		const companyInput = screen.getByDisplayValue("Acme Corp");
		await userEvent.clear(companyInput);
		await userEvent.type(companyInput, "New Corp");

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onSave).toHaveBeenCalledOnce();
		const saved = onSave.mock.calls[0][0];
		expect(saved.link).toBe(baseJob.link);
		expect(saved.company).toBe("New Corp");
	});

	it("includes updated link value when link was edited", async () => {
		const onSave = vi.fn();
		renderDialog({ initialValues: baseJob, onSave });

		await userEvent.click(screen.getByRole("button", { name: "Edit link" }));
		const input = screen.getByPlaceholderText("https://...");
		await userEvent.clear(input);
		await userEvent.type(input, "https://newjob.example.com");

		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onSave).toHaveBeenCalledOnce();
		expect(onSave.mock.calls[0][0].link).toBe("https://newjob.example.com");
	});
});
