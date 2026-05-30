import { getDefaultQuestionType } from "./interviewUtils";
import type { Interview, InterviewQuestion } from "./types";

const BASE_INTERVIEW: Interview = {
	id: 1,
	job_id: 10,
	interview_stage: "onsite",
	interview_dttm: "2024-03-12T14:00",
	interview_interviewers: null,
	interview_type: null,
	interview_vibe: null,
	interview_notes: null,
	interview_result: null,
	interview_feeling: null,
};

const makeQuestion = (
	overrides: Partial<InterviewQuestion> = {},
): InterviewQuestion => ({
	id: 1,
	interview_id: 1,
	question_type: "behavioral",
	question_text: "Tell me about yourself",
	question_notes: null,
	difficulty: 3,
	...overrides,
});

describe("getDefaultQuestionType", () => {
	describe("when questions already exist", () => {
		it("returns the type of the last question regardless of interview_type", () => {
			const questions = [
				makeQuestion({ question_type: "behavioral" }),
				makeQuestion({ id: 2, question_type: "coding" }),
			];
			expect(
				getDefaultQuestionType(
					{ ...BASE_INTERVIEW, interview_type: "system_design" },
					questions,
				),
			).toBe("coding");
		});

		it("returns the type of the only question when there is one", () => {
			const questions = [makeQuestion({ question_type: "system_design" })];
			expect(getDefaultQuestionType(BASE_INTERVIEW, questions)).toBe(
				"system_design",
			);
		});
	});

	describe("when there are no existing questions", () => {
		it.each([
			["recruiter_call", "culture_fit"],
			["behavioral", "behavioral"],
			["leadership", "behavioral"],
			["coding", "coding"],
			["system_design", "system_design"],
			["past_experience", "technical"],
			["culture_fit", "culture_fit"],
		] as const)("maps interview_type %s → question type %s", (interviewType, expectedQuestionType) => {
			expect(
				getDefaultQuestionType(
					{ ...BASE_INTERVIEW, interview_type: interviewType },
					[],
				),
			).toBe(expectedQuestionType);
		});

		it("defaults to behavioral when interview_type is null", () => {
			expect(
				getDefaultQuestionType({ ...BASE_INTERVIEW, interview_type: null }, []),
			).toBe("behavioral");
		});
	});
});
