import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { api } from "../../api";
import type { LinkJob } from "../../types";
import TransitionJobsDialog from "./TransitionJobsDialog";

vi.mock(import("../../api"), () => ({
	api: {
		getLinkJobs: vi.fn(),
	},
}));

const MOCK_JOBS: LinkJob[] = [
	{
		company: "Acme",
		date_applied: "2026-03-01",
		ending_substatus: null,
		id: 1,
		link: "https://acme.com/job",
		role: "Senior Engineer",
		status: "Applied",
	},
	{
		company: "Globex",
		date_applied: null,
		ending_substatus: null,
		id: 2,
		link: "",
		role: "Staff Engineer",
		status: "Phone screen",
	},
];

const DEFAULT_PROPS = {
	from: "Applied",
	onClose: vi.fn(),
	open: true,
	to: "Phone screen",
	window: "all" as const,
};

describe(TransitionJobsDialog, () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows the from → to transition in the title", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText(/Applied/)).toBeInTheDocument(),
		);
		expect(screen.getByText(/Phone screen/)).toBeInTheDocument();
	});

	it("shows a loading spinner while fetching", () => {
		vi.mocked(api.getLinkJobs).mockReturnValue(new Promise(() => {}));
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows job count in the title after loading", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText("(2 jobs)")).toBeInTheDocument(),
		);
	});

	it("shows singular 'job' label when count is 1", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue([MOCK_JOBS[0]]);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText("(1 job)")).toBeInTheDocument(),
		);
	});

	it("renders each job's company and role", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() => expect(screen.getByText("Acme")).toBeInTheDocument());
		expect(screen.getByText("Globex")).toBeInTheDocument();
		expect(screen.getByText(/Senior Engineer/)).toBeInTheDocument();
		expect(screen.getByText(/Staff Engineer/)).toBeInTheDocument();
	});

	it("includes the applied date in the secondary text when present", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText(/Applied 2026-03-01/)).toBeInTheDocument(),
		);
	});

	it("renders an external link button for jobs with a link", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(
				screen.getByRole("link", { name: "Open Acme posting" }),
			).toBeInTheDocument(),
		);
	});

	it("does not render an external link button for jobs without a link", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() => expect(screen.getByText("Globex")).toBeInTheDocument());
		expect(
			screen.queryByRole("link", { name: "Open Globex posting" }),
		).not.toBeInTheDocument();
	});

	it("shows 'No jobs found.' when the API returns an empty list", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue([]);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText("No jobs found.")).toBeInTheDocument(),
		);
	});

	it("shows empty list when the API call fails", async () => {
		vi.mocked(api.getLinkJobs).mockRejectedValue(new Error("Network error"));
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(screen.getByText("No jobs found.")).toBeInTheDocument(),
		);
	});

	it("calls getLinkJobs with correct from, to, and window args", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue([]);
		render(<TransitionJobsDialog {...DEFAULT_PROPS} />);
		await waitFor(() =>
			expect(api.getLinkJobs).toHaveBeenCalledWith(
				"Applied",
				"Phone screen",
				"all",
			),
		);
	});

	it("does not fetch when open is false", () => {
		render(<TransitionJobsDialog {...DEFAULT_PROPS} open={false} />);
		expect(api.getLinkJobs).not.toHaveBeenCalled();
	});

	it("re-fetches when the dialog is reopened", async () => {
		vi.mocked(api.getLinkJobs).mockResolvedValue(MOCK_JOBS);
		const { rerender } = render(
			<TransitionJobsDialog {...DEFAULT_PROPS} open={false} />,
		);
		expect(api.getLinkJobs).not.toHaveBeenCalled();

		rerender(<TransitionJobsDialog {...DEFAULT_PROPS} open />);
		await waitFor(() => expect(api.getLinkJobs).toHaveBeenCalledOnce());
	});
});
