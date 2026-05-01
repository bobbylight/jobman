export interface User {
	id: number;
	email: string;
	displayName: string | null;
	avatarUrl: string | null;
}

export type JobStatus =
	| "Not started"
	| "Applied"
	| "Phone screen"
	| "Interviewing"
	| "Offer!"
	| "Rejected/Withdrawn";

export type EndingSubstatus =
	| "Withdrawn"
	| "Rejected"
	| "Ghosted"
	| "No response"
	| "Job closed"
	| "Not a good fit"
	| "Offer declined"
	| "Offer accepted";

export type FitScore =
	| "Not sure"
	| "Very Low"
	| "Low"
	| "Medium"
	| "High"
	| "Very High";

export type JobTag =
	| "remote"
	| "hybrid"
	| "in-office"
	| "high-pay"
	| "faang"
	| "faang-adjacent"
	| "startup";

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
	/** Absent when loaded via the summary view; present via the full view or individual job fetch. */
	notes?: string | null;
	/** Absent when loaded via the summary view; present via the full view or individual job fetch. */
	job_description?: string | null;
	ending_substatus: EndingSubstatus | null;
	date_phone_screen: string | null;
	date_last_onsite: string | null;
	favorite: boolean;
	tags: JobTag[];
	created_at: string;
	updated_at: string;
}

export type JobFormData = Omit<Job, "id" | "created_at">;

export type InterviewStage = "phone_screen" | "onsite";
export type InterviewType =
	| "recruiter_call"
	| "behavioral"
	| "leadership"
	| "coding"
	| "system_design"
	| "past_experience"
	| "culture_fit";
export type InterviewVibe = "casual" | "intense";
export type InterviewResult = "passed" | "failed";
export type InterviewFeeling =
	| "aced"
	| "pretty_good"
	| "meh"
	| "struggled"
	| "flunked";

export interface Interview {
	id: number;
	job_id: number;
	interview_stage: InterviewStage;
	interview_dttm: string;
	interview_interviewers: string | null;
	interview_type: InterviewType | null;
	interview_vibe: InterviewVibe | null;
	interview_notes: string | null;
	interview_result: InterviewResult | null;
	interview_feeling: InterviewFeeling | null;
}

export type InterviewFormData = Omit<Interview, "id" | "job_id">;

export interface EnrichedInterview extends Interview {
	job: {
		id: number;
		company: string;
		role: string;
		link: string;
	};
}

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

export interface InterviewInsightsResponse {
	totalInterviews: number;
	passRate: number | null;
	totalQuestions: number;
	avgDifficulty: number | null;
	byStage: { stage: string; count: number; passed: number; failed: number }[];
	byType: { type: string; count: number; passed: number; failed: number }[];
	feelingVsResult: {
		feeling: string;
		passed: number;
		failed: number;
		noResult: number;
	}[];
	vibeVsResult: {
		vibe: string;
		count: number;
		passed: number;
		failed: number;
	}[];
	questionsByType: {
		type: string;
		count: number;
		avgDifficulty: number;
		passRate: number | null;
	}[];
	difficultyDistribution: {
		difficulty: number;
		count: number;
		passed: number;
		failed: number;
	}[];
	recentQuestions: {
		id: number;
		question_text: string;
		question_type: string;
		question_notes: string | null;
		difficulty: number;
		interview_result: string | null;
		company: string;
		role: string;
		interview_dttm: string;
	}[];
}

export interface StatsResponse {
	totalApplications: number;
	companiesApplied: number;
	companiesPhoneScreened: number;
	companiesOnSited: number;
	activePipeline: number;
	offersReceived: number;
	/** Fraction 0–1, or null when there's no data. */
	responseRate: number | null;
	byStatus: { status: string; count: number }[];
	applicationsByWeek: { week: string; count: number }[];
	avgDaysPerStage: { stage: string; avgDays: number }[];
	interviewsByWeek: { week: string; count: number }[];
	/** Consecutive status transitions for the Sankey chart. */
	transitions: { from: string; to: string; count: number }[];
	/** Weekly pipeline snapshots — how many jobs were in each status each week. */
	statusOverTime: { week: string; status: string; count: number }[];
	/** Top 6 companies by application count with summary stats. */
	topCompanies: {
		company: string;
		applications: number;
		active: number;
		bestStage: string;
	}[];
}
