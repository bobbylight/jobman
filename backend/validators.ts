export const TERMINAL_STATUSES = new Set(["Rejected/Withdrawn", "Offer!"]);
export const VALID_INTERVIEW_TYPES = new Set(["phone_screen", "onsite"]);
export const VALID_INTERVIEW_VIBES = new Set(["casual", "intense"]);
export const VALID_QUESTION_TYPES = new Set([
	"behavioral",
	"technical",
	"system_design",
	"coding",
	"culture_fit",
]);
export const VALID_ENDING_SUBSTATUSES = new Set([
	"Withdrawn",
	"Rejected",
	"Ghosted",
	"No response",
	"Offer declined",
	"Offer accepted",
]);

export function validateEndingSubstatus(
	status: string,
	ending_substatus: unknown,
): string | null {
	if (TERMINAL_STATUSES.has(status)) {
		if (
			typeof ending_substatus !== "string" ||
			!VALID_ENDING_SUBSTATUSES.has(ending_substatus)
		) {
			return `ending_substatus is required for status "${status}" and must be one of: ${[...VALID_ENDING_SUBSTATUSES].join(", ")}`;
		}
	} else if (ending_substatus != null) {
		return `ending_substatus must be null when status is "${status}"`;
	}
	return null;
}

export function validateInterview(
	body: Record<string, unknown>,
): string | null {
	if (!body.interview_type || typeof body.interview_type !== "string") {
		return "interview_type is required";
	}
	if (!VALID_INTERVIEW_TYPES.has(body.interview_type)) {
		return `interview_type must be one of: ${[...VALID_INTERVIEW_TYPES].join(", ")}`;
	}
	if (!body.interview_dttm || typeof body.interview_dttm !== "string") {
		return "interview_dttm is required";
	}
	if (
		body.interview_vibe != null &&
		(typeof body.interview_vibe !== "string" ||
			!VALID_INTERVIEW_VIBES.has(body.interview_vibe))
	) {
		return `interview_vibe must be one of: ${[...VALID_INTERVIEW_VIBES].join(", ")}`;
	}
	return null;
}

export function validateInterviewQuestion(
	body: Record<string, unknown>,
): string | null {
	if (!body.question_type || typeof body.question_type !== "string") {
		return "question_type is required";
	}
	if (!VALID_QUESTION_TYPES.has(body.question_type)) {
		return `question_type must be one of: ${[...VALID_QUESTION_TYPES].join(", ")}`;
	}
	if (!body.question_text || typeof body.question_text !== "string") {
		return "question_text is required";
	}
	if (body.difficulty == null) {
		return "difficulty is required";
	}
	const difficulty = Number(body.difficulty);
	if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
		return "difficulty must be an integer between 1 and 5";
	}
	return null;
}
