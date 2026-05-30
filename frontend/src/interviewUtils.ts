import type { Interview, InterviewQuestion, QuestionType } from "./types";

const INTERVIEW_TYPE_TO_QUESTION_TYPE: Record<
	NonNullable<Interview["interview_type"]>,
	QuestionType
> = {
	behavioral: "behavioral",
	coding: "coding",
	culture_fit: "culture_fit",
	leadership: "behavioral",
	past_experience: "technical",
	recruiter_call: "culture_fit",
	system_design: "system_design",
};

export function getDefaultQuestionType(
	interview: Interview,
	questions: InterviewQuestion[],
): QuestionType {
	const lastQuestion = questions[questions.length - 1];
	if (lastQuestion) {
		return lastQuestion.question_type;
	}
	return (
		(interview.interview_type &&
			INTERVIEW_TYPE_TO_QUESTION_TYPE[interview.interview_type]) ||
		"behavioral"
	);
}
