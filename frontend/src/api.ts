import type {
	Job,
	JobFormData,
	User,
	Interview,
	EnrichedInterview,
	InterviewFormData,
	InterviewQuestion,
	InterviewQuestionFormData,
	StatsResponse,
	StatsWindow,
} from "./types";

const BASE = "/api";

let unauthorizedHandler: (() => void) | null = null;

/** Register a callback invoked whenever any API request receives a 401. */
export function setUnauthorizedHandler(handler: () => void): void {
	unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		...options,
	});
	if (res.status === 401) {
		unauthorizedHandler?.();
	}
	if (!res.ok) throw new Error(`API error ${res.status}`);
	return res.json() as Promise<T>;
}

export const api = {
	// Auth
	getMe: async (): Promise<User | null> => {
		const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
		if (res.status === 401) return null;
		if (!res.ok) throw new Error(`API error ${res.status}`);
		return res.json() as Promise<User>;
	},
	logout: () =>
		request<{ success: boolean }>("/auth/logout", { method: "POST" }),

	// Jobs
	getJobs: () => request<Job[]>("/jobs"),
	getJob: (id: number) => request<Job>(`/jobs/${id}`),
	createJob: (data: JobFormData) =>
		request<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
	updateJob: (id: number, data: Partial<JobFormData>) =>
		request<Job>(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
	deleteJob: (id: number) =>
		request<{ success: boolean }>(`/jobs/${id}`, { method: "DELETE" }),

	// Stats
	getStats: (window: StatsWindow) =>
		request<StatsResponse>(`/stats?window=${window}`),

	// Cross-job interview search
	loadMoreInterviews: (after: string, limit = 10) => {
		const params = new URLSearchParams({ after, limit: String(limit) });
		return request<EnrichedInterview[]>(`/interviews?${params.toString()}`);
	},
	searchInterviews: (from?: string, to?: string) => {
		const params = new URLSearchParams();
		if (from) params.set("from", from);
		if (to) params.set("to", to);
		const qs = params.toString();
		return request<EnrichedInterview[]>(`/interviews${qs ? `?${qs}` : ""}`);
	},

	// Interviews
	getInterviews: (jobId: number) =>
		request<Interview[]>(`/jobs/${jobId}/interviews`),
	createInterview: (jobId: number, data: InterviewFormData) =>
		request<Interview>(`/jobs/${jobId}/interviews`, {
			method: "POST",
			body: JSON.stringify(data),
		}),
	updateInterview: (
		jobId: number,
		interviewId: number,
		data: InterviewFormData,
	) =>
		request<Interview>(`/jobs/${jobId}/interviews/${interviewId}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	deleteInterview: (jobId: number, interviewId: number) =>
		request<{ success: boolean }>(`/jobs/${jobId}/interviews/${interviewId}`, {
			method: "DELETE",
		}),

	// Interview Questions
	getQuestions: (jobId: number, interviewId: number) =>
		request<InterviewQuestion[]>(
			`/jobs/${jobId}/interviews/${interviewId}/questions`,
		),
	createQuestion: (
		jobId: number,
		interviewId: number,
		data: InterviewQuestionFormData,
	) =>
		request<InterviewQuestion>(
			`/jobs/${jobId}/interviews/${interviewId}/questions`,
			{ method: "POST", body: JSON.stringify(data) },
		),
	updateQuestion: (
		jobId: number,
		interviewId: number,
		questionId: number,
		data: InterviewQuestionFormData,
	) =>
		request<InterviewQuestion>(
			`/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
			{ method: "PUT", body: JSON.stringify(data) },
		),
	deleteQuestion: (jobId: number, interviewId: number, questionId: number) =>
		request<{ success: boolean }>(
			`/jobs/${jobId}/interviews/${interviewId}/questions/${questionId}`,
			{ method: "DELETE" },
		),
};
