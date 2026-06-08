export interface User {
	id: number;
	email: string;
	displayName: string | null;
	avatarUrl: string | null;
}

export type JobStatus =
	| "not_started"
	| "applied"
	| "phone_screen"
	| "interviewing"
	| "offer"
	| "rejected_or_withdrawn";

export type RejectedSubstatus =
	| "Withdrawn"
	| "Rejected"
	| "Ghosted"
	| "No response"
	| "Job closed"
	| "Not a good fit";

export type OfferSubstatus = "Offer accepted" | "Offer declined";

export type EndingSubstatus = RejectedSubstatus | OfferSubstatus;

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

export interface LinkJob {
	id: number;
	company: string;
	role: string;
	status: string;
	ending_substatus: string | null;
	date_applied: string | null;
	link: string;
}

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
	date_offer_extended: string | null;
	favorite: boolean;
	has_offer: boolean;
	tags: JobTag[];
	created_at: string;
	updated_at: string;
}

export type JobFormData = Omit<Job, "id" | "created_at">;

export type EquityType =
	| "rsus"
	| "isos"
	| "nsos"
	| "profit_sharing"
	| "phantom";

export interface Offer {
	id: number;
	job_id: number;
	base_pay_amount: number | null;
	target_bonus_percent: number | null;
	equity_amount: number | null;
	equity_vesting_years: number;
	equity_type: EquityType | null;
	signing_bonus_amount: number | null;
	wellness_stipend_amount: number | null;
	other_amount: number | null;
	other_label: string | null;
	other_is_recurring: boolean;
	k401_match_percent: number | null;
	offer_deadline: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export type OfferFormData = Omit<
	Offer,
	"id" | "job_id" | "created_at" | "updated_at"
>;

export interface OfferComparisonEntry {
	job: Job;
	offer: Offer | null;
}

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

export type RadarEligibility =
	| "active"
	| "cooling_down"
	| "clear"
	| "no_history"
	| "limit_reached";
export type RadarTier = "faang" | "faang_adjacent" | "custom";
export type RadarPolicyConfidence = "official" | "community" | "estimate";

export interface RadarPolicy {
	application_cooldown_days: number | null;
	phone_screen_cooldown_days: number | null;
	onsite_cooldown_days: number | null;
	max_apps_per_period: number | null;
	apps_period_days: number | null;
	summary: string | null;
	url: string | null;
	confidence: RadarPolicyConfidence | null;
	updated_at: string | null;
}

export interface RadarJobSummary {
	id: number;
	role: string;
	status: string;
	date_applied: string | null;
}

export interface RadarEntry {
	id: number;
	name: string;
	tier: RadarTier;
	eligibility: RadarEligibility;
	unlock_date: string | null;
	days_until_unlock: number | null;
	last_application_date: string | null;
	last_interview_date: string | null;
	latest_active_status: string | null;
	active_job_id: number | null;
	jobs: RadarJobSummary[];
	policy: RadarPolicy;
	user_notes: string | null;
	hidden: boolean;
}

export interface RadarResponse {
	entries: RadarEntry[];
	generated_at: string;
}

export type RadarPatch = Partial<{
	hidden: number;
	user_notes: string | null;
	application_cooldown_days: number | null;
	phone_screen_cooldown_days: number | null;
	onsite_cooldown_days: number | null;
	max_apps_per_period: number | null;
	apps_period_days: number | null;
	policy_summary: string | null;
	policy_url: string | null;
	policy_confidence: string | null;
	policy_updated_at: string | null;
}>;

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
