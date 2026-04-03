export interface User {
	id: number;
	email: string;
	displayName: string | null;
	avatarUrl: string | null;
}

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

export type InterviewType = "phone_screen" | "onsite";
export type InterviewVibe = "casual" | "intense";

export interface Interview {
	id: number;
	job_id: number;
	interview_type: InterviewType;
	interview_dttm: string;
	interview_interviewers: string | null;
	interview_vibe: InterviewVibe | null;
	interview_notes: string | null;
}

export type InterviewFormData = Omit<Interview, "id" | "job_id">;

export type QuestionType =
	| "behavioral"
	| "technical"
	| "system_design"
	| "coding"
	| "culture_fit";

export interface InterviewQuestion {
	id: number;
	interview_id: number;
	question_type: QuestionType;
	question_text: string;
	question_notes: string | null;
	difficulty: number;
}

export type InterviewQuestionFormData = Omit<
	InterviewQuestion,
	"id" | "interview_id"
>;

export type StatsWindow = "all" | "90" | "30";

export interface StatsResponse {
	totalApplications: number;
	activePipeline: number;
	offersReceived: number;
	/** Fraction 0–1, or null when there's no data. */
	responseRate: number | null;
	byStatus: { status: string; count: number }[];
	applicationsByWeek: { week: string; count: number }[];
}
