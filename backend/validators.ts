export const TERMINAL_STATUSES = new Set(["Rejected/Withdrawn", "Offer!"]);

// ── Max-length constants ───────────────────────────────────────────────────────
export const JOB_MAX_LENGTHS = {
	company: 128,
	job_description: 20_000,
	link: 4096,
	notes: 20_000,
	recruiter: 128,
	referred_by: 128,
	role: 256,
	salary: 64,
} as const;

export const INTERVIEW_MAX_LENGTHS = {
	interview_interviewers: 128,
	interview_notes: 4096,
} as const;

export const QUESTION_MAX_LENGTHS = {
	question_notes: 4096,
	question_text: 4096,
} as const;

function checkLength(
	value: unknown,
	field: string,
	max: number,
): string | null {
	if (typeof value === "string" && value.length > max) {
		return `${field} must be at most ${max.toLocaleString()} characters`;
	}
	return null;
}

export function validateJobFields(
	body: Record<string, unknown>,
): string | null {
	for (const [field, max] of Object.entries(JOB_MAX_LENGTHS)) {
		const err = checkLength(body[field], field, max);
		if (err) {
			return err;
		}
	}
	return null;
}

export const VALID_INTERVIEW_STAGES = new Set(["phone_screen", "onsite"]);
export const VALID_INTERVIEW_TYPES = new Set([
	"behavioral",
	"leadership",
	"coding",
	"system_design",
	"past_experience",
	"culture_fit",
]);
export const VALID_INTERVIEW_VIBES = new Set(["casual", "intense"]);
export const VALID_INTERVIEW_RESULTS = new Set(["passed", "failed"]);
export const VALID_INTERVIEW_FEELINGS = new Set([
	"aced",
	"pretty_good",
	"meh",
	"struggled",
	"flunked",
]);
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
	if (!body.interview_stage || typeof body.interview_stage !== "string") {
		return "interview_stage is required";
	}
	if (!VALID_INTERVIEW_STAGES.has(body.interview_stage)) {
		return `interview_stage must be one of: ${[...VALID_INTERVIEW_STAGES].join(", ")}`;
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
	if (
		body.interview_type != null &&
		(typeof body.interview_type !== "string" ||
			!VALID_INTERVIEW_TYPES.has(body.interview_type))
	) {
		return `interview_type must be one of: ${[...VALID_INTERVIEW_TYPES].join(", ")}`;
	}
	if (
		body.interview_result != null &&
		(typeof body.interview_result !== "string" ||
			!VALID_INTERVIEW_RESULTS.has(body.interview_result))
	) {
		return `interview_result must be one of: ${[...VALID_INTERVIEW_RESULTS].join(", ")}`;
	}
	if (
		body.interview_feeling != null &&
		(typeof body.interview_feeling !== "string" ||
			!VALID_INTERVIEW_FEELINGS.has(body.interview_feeling))
	) {
		return `interview_feeling must be one of: ${[...VALID_INTERVIEW_FEELINGS].join(", ")}`;
	}
	for (const [field, max] of Object.entries(INTERVIEW_MAX_LENGTHS)) {
		const err = checkLength(body[field], field, max);
		if (err) {
			return err;
		}
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
	for (const [field, max] of Object.entries(QUESTION_MAX_LENGTHS)) {
		const err = checkLength(body[field], field, max);
		if (err) {
			return err;
		}
	}
	return null;
}
