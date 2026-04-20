import React from "react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import QuestionSubView from "./QuestionSubView";
import { api } from "../api";
import type { Interview, InterviewQuestion } from "../types";

vi.mock(import("../api"));

const BASE_INTERVIEW: Interview = {
	id: 10,
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

const makeQuestion = (
	overrides: Partial<InterviewQuestion> = {},
): InterviewQuestion => ({
	difficulty: 3,
	id: 1,
	interview_id: 10,
	question_notes: null,
	question_text: "Tell me about yourself",
	question_type: "behavioral",
	...overrides,
});

const QUESTION_A = makeQuestion({
	difficulty: 3,
	id: 1,
	question_text: "Tell me about yourself",
	question_type: "behavioral",
});

const QUESTION_B = makeQuestion({
	difficulty: 4,
	id: 2,
	question_text: "Explain closures in JavaScript",
	question_type: "technical",
});

const DEFAULT_PROPS = {
	interview: BASE_INTERVIEW,
	jobId: 42,
};

describe(QuestionSubView, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.getQuestions).mockResolvedValue([]);
	});

	describe("loading state", () => {
		it("shows a loading spinner while fetching", () => {
			vi.mocked(api.getQuestions).mockReturnValue(new Promise(() => {}));
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("hides the spinner after questions load", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
			});
		});

		it("calls getQuestions with the correct jobId and interviewId", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(api.getQuestions).toHaveBeenCalledWith(42, 10);
			});
		});
	});

	describe("interview summary header", () => {
		it("renders the interview type label", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Phone Screen")).toBeInTheDocument();
			});
		});

		it("renders the vibe chip when present", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Casual")).toBeInTheDocument();
			});
		});

		it("renders the interviewers when present", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			});
		});

		it("renders an onsite interview type label correctly", async () => {
			render(
				<QuestionSubView
					{...DEFAULT_PROPS}
					interview={{ ...BASE_INTERVIEW, interview_stage: "onsite" }}
				/>,
			);
			await waitFor(() => {
				expect(screen.getByText("Onsite")).toBeInTheDocument();
			});
		});
	});

	describe("empty state", () => {
		it("shows the empty state message when there are no questions", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.getByText(/No questions recorded yet/i),
				).toBeInTheDocument();
				expect(screen.getByText("Add one.")).toBeInTheDocument();
			});
		});

		it("hides the Add Question button when there are no questions", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.queryByRole("button", { name: /Add Question/i }),
				).not.toBeInTheDocument();
			});
		});

		it("opens the add form when the Add one link is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => screen.getByText("Add one."));
			fireEvent.click(screen.getByText("Add one."));
			expect(
				screen.getByRole("button", { name: "Save Question" }),
			).toBeInTheDocument();
		});
	});

	describe("question list", () => {
		beforeEach(() => {
			vi.mocked(api.getQuestions).mockResolvedValue([QUESTION_A, QUESTION_B]);
		});

		it("renders a card for each question", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
				expect(
					screen.getByText("Explain closures in JavaScript"),
				).toBeInTheDocument();
			});
		});

		it("renders the question type chip with the correct label", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("Behavioral")).toBeInTheDocument();
				expect(screen.getByText("Technical")).toBeInTheDocument();
			});
		});

		it("shows the Add Question button when questions exist", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /Add Question/i }),
				).toBeInTheDocument();
			});
		});

		it("shows edit and delete buttons for each question", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(
					screen.getAllByRole("button", { name: "Edit question" }),
				).toHaveLength(2);
				expect(
					screen.getAllByRole("button", { name: "Delete question" }),
				).toHaveLength(2);
			});
		});

		it("renders markdown-formatted question notes", async () => {
			vi.mocked(api.getQuestions).mockResolvedValue([
				makeQuestion({ question_notes: "**important note**" }),
			]);
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => {
				expect(screen.getByText("important note")).toBeInTheDocument();
			});
		});
	});

	describe("Add Question", () => {
		beforeEach(() => {
			vi.mocked(api.getQuestions).mockResolvedValue([QUESTION_A]);
		});

		it("shows the add form when Add Question is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			expect(
				screen.getByRole("button", { name: "Save Question" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Cancel" }),
			).toBeInTheDocument();
		});

		it("hides the Add Question button while the form is open", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			expect(
				screen.queryByRole("button", { name: /Add Question/i }),
			).not.toBeInTheDocument();
		});

		it("shows a validation error when saving with empty question text", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));
			expect(screen.getByText("Question text is required")).toBeInTheDocument();
			expect(api.createQuestion).not.toHaveBeenCalled();
		});

		it("calls createQuestion with the correct args and refreshes the list on save", async () => {
			const newQuestion = makeQuestion({
				id: 99,
				question_text: "A new question",
			});
			vi.mocked(api.createQuestion).mockResolvedValue(newQuestion);
			vi.mocked(api.getQuestions)
				.mockResolvedValueOnce([QUESTION_A])
				.mockResolvedValueOnce([QUESTION_A, newQuestion]);

			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			fireEvent.change(screen.getByLabelText(/^Question$/i), {
				target: { value: "A new question" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));

			await waitFor(() => {
				expect(api.createQuestion).toHaveBeenCalledWith(
					42,
					10,
					expect.objectContaining({ question_text: "A new question" }),
				);
			});
			await waitFor(() => {
				expect(screen.getByText("A new question")).toBeInTheDocument();
			});
		});

		it("shows an error message when createQuestion fails", async () => {
			vi.mocked(api.createQuestion).mockRejectedValue(
				new Error("Network error"),
			);

			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			fireEvent.change(screen.getByLabelText(/^Question$/i), {
				target: { value: "A question" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));

			await waitFor(() => {
				expect(
					screen.getByText("Failed to save. Please try again."),
				).toBeInTheDocument();
			});
		});

		it("hides the form and restores the list when Cancel is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: /Add Question/i }),
			);
			fireEvent.click(screen.getByRole("button", { name: /Add Question/i }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(
				screen.queryByRole("button", { name: "Save Question" }),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Add Question/i }),
			).toBeInTheDocument();
		});
	});

	describe("Edit Question", () => {
		beforeEach(() => {
			vi.mocked(api.getQuestions).mockResolvedValue([QUESTION_A]);
		});

		it("shows the edit form when Edit question is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit question" }));
			expect(
				screen.getByRole("button", { name: "Save Question" }),
			).toBeInTheDocument();
		});

		it("pre-fills the form with the question's existing values", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit question" }));
			expect(screen.getByLabelText(/^Question$/i)).toHaveValue(
				QUESTION_A.question_text,
			);
		});

		it("calls updateQuestion with the correct args on save", async () => {
			vi.mocked(api.updateQuestion).mockResolvedValue(QUESTION_A);
			vi.mocked(api.getQuestions)
				.mockResolvedValueOnce([QUESTION_A])
				.mockResolvedValueOnce([QUESTION_A]);

			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Edit question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Edit question" }));
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));

			await waitFor(() => {
				expect(api.updateQuestion).toHaveBeenCalledWith(
					42,
					10,
					QUESTION_A.id,
					expect.objectContaining({
						question_text: QUESTION_A.question_text,
						question_type: QUESTION_A.question_type,
					}),
				);
			});
		});
	});

	describe("Delete Question", () => {
		beforeEach(() => {
			vi.mocked(api.getQuestions).mockResolvedValue([QUESTION_A]);
		});

		it("shows a confirmation prompt when Delete question is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete question" }));
			expect(screen.getByText("Delete this question?")).toBeInTheDocument();
		});

		it("hides the confirmation when Cancel is clicked", async () => {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete question" }));
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
			expect(
				screen.queryByText("Delete this question?"),
			).not.toBeInTheDocument();
		});

		it("calls deleteQuestion and removes the question on confirm", async () => {
			vi.mocked(api.deleteQuestion).mockResolvedValue({ success: true });
			vi.mocked(api.getQuestions)
				.mockResolvedValueOnce([QUESTION_A])
				.mockResolvedValueOnce([]);

			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() =>
				screen.getByRole("button", { name: "Delete question" }),
			);
			fireEvent.click(screen.getByRole("button", { name: "Delete question" }));

			const confirmBox = screen
				.getByText("Delete this question?")
				.closest("div") as HTMLElement;
			fireEvent.click(
				within(confirmBox).getByRole("button", { name: "Delete" }),
			);

			await waitFor(() => {
				expect(api.deleteQuestion).toHaveBeenCalledWith(42, 10, QUESTION_A.id);
			});
			await waitFor(() => {
				expect(
					screen.queryByText("Tell me about yourself"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("field length validation", () => {
		beforeEach(() => {
			vi.mocked(api.getQuestions).mockResolvedValue([]);
		});

		async function openAddForm() {
			render(<QuestionSubView {...DEFAULT_PROPS} />);
			await waitFor(() => screen.getByText(/No questions recorded yet/i));
			fireEvent.click(screen.getByText("Add one."));
		}

		it("shows an error when question text exceeds 4096 characters", async () => {
			await openAddForm();
			fireEvent.change(screen.getByLabelText(/Question/i), {
				target: { value: "a".repeat(4097) },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));
			await waitFor(() => {
				expect(
					screen.getByText("Question text must be 4,096 characters or fewer"),
				).toBeInTheDocument();
			});
			expect(api.createQuestion).not.toHaveBeenCalled();
		});

		it("does not show an error when question text is within 4096 characters", async () => {
			vi.mocked(api.createQuestion).mockResolvedValue(makeQuestion({ id: 99 }));
			vi.mocked(api.getQuestions)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([makeQuestion({ id: 99 })]);
			await openAddForm();
			fireEvent.change(screen.getByLabelText(/Question/i), {
				target: { value: "a".repeat(4096) },
			});
			fireEvent.click(screen.getByRole("button", { name: "Save Question" }));
			await waitFor(() => {
				expect(api.createQuestion).toHaveBeenCalled();
			});
		});
	});
});
