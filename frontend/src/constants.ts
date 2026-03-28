import type { JobStatus, FitScore, EndingSubstatus } from "./types";

export const STATUSES: JobStatus[] = [
	"Not started",
	"Resume submitted",
	"Initial interview",
	"Final round interview",
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
	"Initial interview": "#ab47bc",
	"Final round interview": "#1e88e5",
	"Offer!": "#66bb6a",
	"Rejected/Withdrawn": "#ef5350",
} satisfies Record<JobStatus, string>;

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
