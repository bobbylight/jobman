import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import InterviewsTab from "./InterviewsTab";
import { api } from "../api";
import type { Interview } from "../types";

vi.mock("../api");

const makeInterview = (overrides: Partial<Interview> = {}): Interview => ({
	id: 1,
	job_id: 42,
	interview_type: "phone_screen",
	interview_dttm: "2024-03-12T14:00",
	interview_interviewers: "Jane Smith",
	interview_vibe: "casual",
	interview_notes: "Great conversation",
	...overrides,
});

const INTERVIEW_A = makeInterview({
	id: 1,
	interview_type: "phone_screen",
	interview_dttm: "2024-03-12T14:00",
	interview_interviewers: "Jane Smith",
	interview_vibe: "casual",
	interview_notes: "Great conversation",
});

const INTERVIEW_B = makeInterview({
	id: 2,
	interview_type: "onsite",
	interview_dttm: "2024-03-19T10:00",
	interview_interviewers: null,
	interview_vibe: "intense",
	interview_notes: null,
});

const DEFAULT_PROPS = {
	jobId: 42,
	onCountChange: vi.fn(),
};

describe("InterviewsTab", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.getInterviews).mockResolvedValue([]);
	});

	describe("loading state", () => {
		it("shows a loading spinner while fetching", () => {
			vi.mocked(api.getInterviews).mockReturnValue(new Promise(() => {}));
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("hides the spinner after interviews load", async () => {
			vi.mocked(api.getInterviews).mockResolvedValue([]);
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});
		});
	});

	describe("empty state", () => {
		it("shows an empty state message when there are no interviews", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText(/No interviews yet/i)).toBeInTheDocument();
			});
		});

		it("calls onCountChange with 0 when there are no interviews", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(DEFAULT_PROPS.onCountChange).toHaveBeenCalledWith(0);
			});
		});
	});

	describe("interview list", () => {
		beforeEach(() => {
			vi.mocked(api.getInterviews).mockResolvedValue([
				INTERVIEW_A,
				INTERVIEW_B,
			]);
		});

		it("renders a card for each interview", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Phone Screen")).toBeInTheDocument();
				expect(screen.getByText("Onsite")).toBeInTheDocument();
			});
		});

		it("shows the interviewers when present", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			});
		});

		it("shows the vibe chip when present", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Casual")).toBeInTheDocument();
				expect(screen.getByText("Intense")).toBeInTheDocument();
			});
		});

		it("shows a truncated first line of notes when present", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Great conversation")).toBeInTheDocument();
			});
		});

		it("calls onCountChange with the interview count", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(DEFAULT_PROPS.onCountChange).toHaveBeenCalledWith(2);
			});
		});

		it("renders interviews sorted by interview_dttm ascending", async () => {
			// Provide them in reverse order
			vi.mocked(api.getInterviews).mockResolvedValue([
				INTERVIEW_B,
				INTERVIEW_A,
			]);
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				const cards = screen.getAllByRole("button", {
					name: /Edit interview/i,
				});
				// We can verify order by checking text positions
				const types = screen
					.getAllByText(/Phone Screen|Onsite/)
					.map((el) => el.textContent);
				expect(types[0]).toBe("Phone Screen"); // A comes before B chronologically
				expect(types[1]).toBe("Onsite");
			});
		});

		it("shows edit and delete buttons for each interview", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.getAllByRole("button", { name: "Edit interview" }),
				).toHaveLength(2);
				expect(
					screen.getAllByRole("button", { name: "Delete interview" }),
				).toHaveLength(2);
			});
		});
	});

	describe("Add Interview", () => {
		it("shows an Add Interview button when in list mode", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /Add Interview/i }),
				).toBeInTheDocument();
			});
		});

		it("shows the form when Add Interview is clicked", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			expect(
				screen.getByRole("button", { name: "Save Interview" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Cancel" }),
			).toBeInTheDocument();
		});

		it("hides the Add Interview button while the form is open", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			expect(
				screen.queryByRole("button", { name: /Add Interview/i }),
			).not.toBeInTheDocument();
		});

		it("hides the form and shows the list when Cancel is clicked", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(
				screen.queryByRole("button", { name: "Save Interview" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Add Interview/i }),
			).toBeInTheDocument();
		});

		it("shows a validation error when saving without a date/time", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			fireEvent.click(screen.getByRole("button", { name: "Save Interview" }));
			expect(
				screen.getByText("Date and time are required"),
			).toBeInTheDocument();
			expect(api.createInterview).not.toHaveBeenCalled();
		});

		it("calls createInterview and refreshes the list on successful save", async () => {
			const newInterview = makeInterview({ id: 99 });
			vi.mocked(api.createInterview).mockResolvedValue(newInterview);
			vi.mocked(api.getInterviews)
				.mockResolvedValueOnce([]) // initial load
				.mockResolvedValueOnce([newInterview]); // after save

			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);

			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			fireEvent.change(screen.getByLabelText(/Date & Time/i), {
				target: { value: "2024-03-12T14:00" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Interview" }));

			await waitFor(() => {
				expect(api.createInterview).toHaveBeenCalledWith(
					42,
					expect.objectContaining({ interview_dttm: "2024-03-12T14:00" }),
				);
			});
		});

		it("shows an error message when createInterview fails", async () => {
			vi.mocked(api.createInterview).mockRejectedValue(
				new Error("Network error"),
			);
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Interview/i }),
			);

			fireEvent.click(screen.getByRole("button", { name: /Add Interview/i }));
			fireEvent.change(screen.getByLabelText(/Date & Time/i), {
				target: { value: "2024-03-12T14:00" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Interview" }));

			await waitFor(() => {
				expect(
					screen.getByText("Failed to save. Please try again."),
				).toBeInTheDocument();
			});
		});
	});

	describe("Edit Interview", () => {
		beforeEach(() => {
			vi.mocked(api.getInterviews).mockResolvedValue([INTERVIEW_A]);
		});

		it("shows the edit form when Edit interview is clicked", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit interview" }));
			expect(
				screen.getByRole("button", { name: "Save Interview" }),
			).toBeInTheDocument();
		});

		it("pre-fills the form with the interview's existing values", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit interview" }));

			expect(screen.getByLabelText(/Date & Time/i)).toHaveValue(
				INTERVIEW_A.interview_dttm.slice(0, 16),
			);
			expect(screen.getByLabelText(/Interviewers/i)).toHaveValue(
				INTERVIEW_A.interview_interviewers,
			);
		});

		it("calls updateInterview on save", async () => {
			vi.mocked(api.updateInterview).mockResolvedValue(INTERVIEW_A);
			vi.mocked(api.getInterviews)
				.mockResolvedValueOnce([INTERVIEW_A])
				.mockResolvedValueOnce([INTERVIEW_A]);

			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit interview" }));
			fireEvent.click(screen.getByRole("button", { name: "Save Interview" }));

			await waitFor(() => {
				expect(api.updateInterview).toHaveBeenCalledWith(
					42,
					INTERVIEW_A.id,
					expect.objectContaining({
						interview_type: INTERVIEW_A.interview_type,
					}),
				);
			});
		});
	});

	describe("Delete Interview", () => {
		beforeEach(() => {
			vi.mocked(api.getInterviews).mockResolvedValue([INTERVIEW_A]);
		});

		it("shows a confirmation prompt when Delete interview is clicked", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete interview" }));
			expect(screen.getByText("Delete this interview?")).toBeInTheDocument();
		});

		it("hides the confirmation when Cancel is clicked", async () => {
			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete interview" }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(
				screen.queryByText("Delete this interview?"),
			).not.toBeInTheDocument();
		});

		it("calls deleteInterview and refreshes the list on confirm", async () => {
			vi.mocked(api.deleteInterview).mockResolvedValue({ success: true });
			vi.mocked(api.getInterviews)
				.mockResolvedValueOnce([INTERVIEW_A])
				.mockResolvedValueOnce([]);

			render(<InterviewsTab {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete interview" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete interview" }));

			const confirmBox = screen
				.getByText("Delete this interview?")
				.closest("div") as HTMLElement;
			fireEvent.click(
				within(confirmBox).getByRole("button", { name: "Delete" }),
			);

			await waitFor(() => {
				expect(api.deleteInterview).toHaveBeenCalledWith(42, INTERVIEW_A.id);
			});
		});
	});
});
