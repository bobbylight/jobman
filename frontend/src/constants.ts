import type {
	EndingSubstatus,
	FitScore,
	InterviewStage,
	InterviewType,
	JobStatus,
	JobTag,
	OfferSubstatus,
	RejectedSubstatus,
} from "./types";

export const STATUSES: JobStatus[] = [
	"not_started",
	"applied",
	"phone_screen",
	"interviewing",
	"offer",
	"rejected_or_withdrawn",
];

export const TERMINAL_STATUSES = new Set<JobStatus>([
	"offer",
	"rejected_or_withdrawn",
]);

export const STATUS_LABELS: Record<JobStatus, string> = {
	not_started: "Not started",
	applied: "Applied",
	phone_screen: "Phone screen",
	interviewing: "Interviewing",
	offer: "Offer!",
	rejected_or_withdrawn: "Rejected/Withdrawn",
};

export const REJECTED_SUBSTATUSES: RejectedSubstatus[] = [
	"Withdrawn",
	"No response",
	"Rejected",
	"Ghosted",
	"Job closed",
	"Not a good fit",
];

export const OFFER_SUBSTATUSES: OfferSubstatus[] = [
	"Offer accepted",
	"Offer declined",
];

export const ENDING_SUBSTATUSES: EndingSubstatus[] = [
	...REJECTED_SUBSTATUSES,
	...OFFER_SUBSTATUSES,
];

export const FIT_SCORES: FitScore[] = [
	"Not sure",
	"Very Low",
	"Low",
	"Medium",
	"High",
	"Very High",
];

// `satisfies` checks the shape at the definition site without widening the type,
// So STATUS_COLORS['Not started'] stays '#90a4ae' (literal) not just `string`.
export const STATUS_COLORS = {
	interviewing: "#1e88e5",
	not_started: "#90a4ae",
	offer: "#66bb6a",
	phone_screen: "#ab47bc",
	rejected_or_withdrawn: "#ef5350",
	applied: "#ffa726",
} satisfies Record<JobStatus, string>;

// Sorted alphabetically by display label
export const JOB_TAGS: JobTag[] = [
	"faang",
	"faang-adjacent",
	"high-pay",
	"hybrid",
	"in-office",
	"remote",
	"startup",
];

export const TAG_LABELS: Record<JobTag, string> = {
	faang: "FAANG",
	"faang-adjacent": "FAANG-Adjacent",
	"high-pay": "High Pay",
	hybrid: "Hybrid",
	"in-office": "In Office",
	remote: "Remote",
	startup: "Startup",
};

// Named MUI palette colors for most tags; hex for tags that exceed the palette.
export const TAG_COLORS: Record<JobTag, string> = {
	faang: "error",
	"faang-adjacent": "#00897b",
	"high-pay": "success",
	hybrid: "secondary",
	"in-office": "warning",
	remote: "info",
	startup: "primary",
};

type MuiChipColor =
	| "primary"
	| "secondary"
	| "error"
	| "info"
	| "success"
	| "warning"
	| "default";
const MUI_CHIP_COLORS = new Set<string>([
	"primary",
	"secondary",
	"error",
	"info",
	"success",
	"warning",
	"default",
]);

/**
 * Returns Chip props for a tag. Named MUI colors are passed as `color`;
 * hex values fall back to `color="default"` with `sx` overrides so the
 * chip still renders in the correct color.
 */
export function tagChipProps(
	tag: JobTag,
	filled = false,
): { color: MuiChipColor; sx?: Record<string, string> } {
	const c = TAG_COLORS[tag];
	if (MUI_CHIP_COLORS.has(c)) {
		return { color: c as MuiChipColor };
	}
	if (filled) {
		return {
			color: "default",
			sx: { backgroundColor: c, color: "#fff", borderColor: c },
		};
	}
	return { color: "default", sx: { borderColor: c, color: c } };
}

export const JOB_MAX_LENGTHS = {
	company: 128,
	cover_letter_url: 4096,
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

export const FIT_SCORE_COLORS = {
	High: "success",
	Low: "warning",
	Medium: "info",
	"Not sure": "default",
	"Very High": "success",
	"Very Low": "error",
} satisfies Record<
	FitScore,
	"default" | "error" | "warning" | "info" | "success"
>;

export const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
	onsite: "Onsite",
	phone_screen: "Phone Screen",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	leadership: "Leadership",
	past_experience: "Past Experience",
	recruiter_call: "Recruiter Call",
	system_design: "System Design",
};
