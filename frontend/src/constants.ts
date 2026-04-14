import type { JobStatus, FitScore, EndingSubstatus, JobTag } from "./types";

export const STATUSES: JobStatus[] = [
	"Not started",
	"Resume submitted",
	"Phone screen",
	"Interviewing",
	"Offer!",
	"Rejected/Withdrawn",
];

export const TERMINAL_STATUSES = new Set<JobStatus>([
	"Offer!",
	"Rejected/Withdrawn",
]);

export const ENDING_SUBSTATUSES: EndingSubstatus[] = [
	"Withdrawn",
	"Rejected",
	"Ghosted",
	"No response",
	"Offer declined",
	"Offer accepted",
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
// so STATUS_COLORS['Not started'] stays '#90a4ae' (literal) not just `string`.
export const STATUS_COLORS = {
	"Not started": "#90a4ae",
	"Resume submitted": "#ffa726",
	"Phone screen": "#ab47bc",
	Interviewing: "#1e88e5",
	"Offer!": "#66bb6a",
	"Rejected/Withdrawn": "#ef5350",
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
	if (MUI_CHIP_COLORS.has(c)) return { color: c as MuiChipColor };
	if (filled)
		return {
			color: "default",
			sx: { backgroundColor: c, color: "#fff", borderColor: c },
		};
	return { color: "default", sx: { color: c, borderColor: c } };
}

export const JOB_MAX_LENGTHS = {
	company: 128,
	role: 256,
	link: 4096,
	salary: 64,
	recruiter: 128,
	referred_by: 128,
	notes: 20_000,
	job_description: 20_000,
} as const;

export const INTERVIEW_MAX_LENGTHS = {
	interview_interviewers: 128,
	interview_notes: 4_096,
} as const;

export const QUESTION_MAX_LENGTHS = {
	question_text: 4_096,
	question_notes: 4_096,
} as const;

export const FIT_SCORE_COLORS = {
	"Not sure": "default",
	"Very Low": "error",
	Low: "warning",
	Medium: "info",
	High: "success",
	"Very High": "success",
} satisfies Record<
	FitScore,
	"default" | "error" | "warning" | "info" | "success"
>;
