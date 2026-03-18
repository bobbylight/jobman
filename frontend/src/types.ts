export type JobStatus =
	| "Not started"
	| "Resume submitted"
	| "Initial interview"
	| "Final round interview"
	| "Offer!"
	| "Rejected/Withdrawn";

export type FitScore =
	| "Not sure"
	| "Very Low"
	| "Low"
	| "Medium"
	| "High"
	| "Very High";

export interface Job {
	id: number;
	date_applied: string | null;
	company: string;
	role: string;
	link: string;
	salary: string | null;
	fit_score: FitScore | null;
	referred_by: string | null;
	status: JobStatus;
	recruiter: string | null;
	notes: string | null;
	favorite: boolean;
	created_at: string;
}

export type JobFormData = Omit<Job, "id" | "created_at">;
