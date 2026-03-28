export type JobStatus =
	| "Not started"
	| "Resume submitted"
	| "Phone screen"
	| "Interviewing"
	| "Offer!"
	| "Rejected/Withdrawn";

export type EndingSubstatus =
	| "Withdrawn"
	| "Rejected"
	| "Ghosted"
	| "No response"
	| "Offer declined"
	| "Offer accepted";

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
	job_description: string | null;
	ending_substatus: EndingSubstatus | null;
	date_phone_screen: string | null;
	date_last_onsite: string | null;
	favorite: boolean;
	created_at: string;
	updated_at: string;
}

export type JobFormData = Omit<Job, "id" | "created_at">;
