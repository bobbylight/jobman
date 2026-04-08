import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "./api";
import type {
	Job,
	JobFormData,
	InterviewQuestion,
	InterviewQuestionFormData,
	StatsResponse,
} from "./types";

const makeResponse = (body: unknown, ok = true) => ({
	ok,
	status: ok ? 200 : 400,
	json: () => Promise.resolve(body),
});

const MOCK_JOB: Job = {
	id: 1,
	company: "Acme",
	role: "Engineer",
	link: "https://acme.com/job",
	status: "Not started",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: null,
	referred_by: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
};

const MOCK_USER = {
	id: 1,
	email: "test@example.com",
	displayName: "Test User",
	avatarUrl: null,
};

describe("api", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getMe", () => {
		it("fetches GET /api/auth/me and returns the user when authenticated", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: () => Promise.resolve(MOCK_USER),
			});
			const result = await api.getMe();
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/auth/me",
				expect.objectContaining({ credentials: "include" }),
			);
			expect(result).toEqual(MOCK_USER);
		});

		it("returns null when the response is 401 (not authenticated)", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve(null),
			});
			const result = await api.getMe();
			expect(result).toBeNull();
		});

		it("throws when the response is an unexpected error status", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.resolve({}),
			});
			await expect(api.getMe()).rejects.toThrow("API error 500");
		});
	});

	describe("logout", () => {
		it("POSTs to /api/auth/logout and returns success", async () => {
			mockFetch.mockResolvedValue(makeResponse({ success: true }));
			const result = await api.logout();
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/auth/logout",
				expect.objectContaining({ method: "POST" }),
			);
			expect(result.success).toBe(true);
		});
	});

	describe("setUnauthorizedHandler", () => {
		afterEach(() => {
			// Reset so the handler doesn't leak into other tests
			setUnauthorizedHandler(() => {});
		});

		it("calls the registered handler when any request receives a 401", async () => {
			const handler = vi.fn();
			setUnauthorizedHandler(handler);
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({}),
			});
			await expect(api.getJobs()).rejects.toThrow("API error 401");
			expect(handler).toHaveBeenCalledOnce();
		});

		it("does not call the handler for non-401 errors", async () => {
			const handler = vi.fn();
			setUnauthorizedHandler(handler);
			mockFetch.mockResolvedValue(
				makeResponse({ error: "Server error" }, false),
			);
			await expect(api.getJobs()).rejects.toThrow("API error 400");
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe("getJobs", () => {
		it("fetches GET /api/jobs and returns the parsed JSON", async () => {
			mockFetch.mockResolvedValue(makeResponse([MOCK_JOB]));
			const result = await api.getJobs();
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs",
				expect.objectContaining({
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(result).toEqual([MOCK_JOB]);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(
				makeResponse({ error: "Server error" }, false),
			);
			await expect(api.getJobs()).rejects.toThrow("API error 400");
		});
	});

	describe("createJob", () => {
		it("POSTs to /api/jobs with JSON body and returns the created job", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_JOB));
			const formData: JobFormData = {
				company: "Acme",
				role: "Engineer",
				link: "https://acme.com/job",
				status: "Not started",
				fit_score: null,
				salary: null,
				date_applied: null,
				recruiter: null,
				notes: null,
				referred_by: null,
				job_description: null,
				ending_substatus: null,
				date_phone_screen: null,
				date_last_onsite: null,
				updated_at: "",
				favorite: false,
			};
			const result = await api.createJob(formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(formData),
				}),
			);
			expect(result).toEqual(MOCK_JOB);
		});
	});

	describe("updateJob", () => {
		it("PUTs to /api/jobs/:id with JSON body and returns the updated job", async () => {
			const updated = { ...MOCK_JOB, company: "Updated" };
			mockFetch.mockResolvedValue(makeResponse(updated));
			const result = await api.updateJob(1, { company: "Updated" });
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1",
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify({ company: "Updated" }),
				}),
			);
			expect(result.company).toBe("Updated");
		});
	});

	describe("deleteJob", () => {
		it("DELETEs /api/jobs/:id and returns success", async () => {
			mockFetch.mockResolvedValue(makeResponse({ success: true }));
			const result = await api.deleteJob(1);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1",
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(result.success).toBe(true);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.deleteJob(99)).rejects.toThrow("API error 400");
		});
	});

	describe("getInterviews", () => {
		it("GETs /api/jobs/:jobId/interviews and returns the list", async () => {
			const mockInterviews = [
				{
					id: 1,
					job_id: 1,
					interview_type: "phone_screen",
					interview_dttm: "2024-03-12T14:00",
					interview_interviewers: "Jane",
					interview_vibe: "casual",
					interview_notes: null,
				},
			];
			mockFetch.mockResolvedValue(makeResponse(mockInterviews));
			const result = await api.getInterviews(1);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews",
				expect.objectContaining({
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(result).toEqual(mockInterviews);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.getInterviews(99)).rejects.toThrow("API error 400");
		});
	});

	describe("createInterview", () => {
		it("POSTs to /api/jobs/:jobId/interviews with JSON body and returns the created interview", async () => {
			const formData = {
				interview_type: "onsite" as const,
				interview_dttm: "2024-03-19T10:00",
				interview_interviewers: "Alice",
				interview_vibe: "intense" as const,
				interview_notes: null,
			};
			const created = { id: 2, job_id: 1, ...formData };
			mockFetch.mockResolvedValue(makeResponse(created));
			const result = await api.createInterview(1, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(formData),
				}),
			);
			expect(result).toEqual(created);
		});
	});

	describe("updateInterview", () => {
		it("PUTs to /api/jobs/:jobId/interviews/:interviewId and returns the updated interview", async () => {
			const formData = {
				interview_type: "onsite" as const,
				interview_dttm: "2024-03-19T10:00",
				interview_interviewers: "Bob",
				interview_vibe: null,
				interview_notes: "Updated notes",
			};
			const updated = { id: 5, job_id: 1, ...formData };
			mockFetch.mockResolvedValue(makeResponse(updated));
			const result = await api.updateInterview(1, 5, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/5",
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(formData),
				}),
			);
			expect(result).toEqual(updated);
		});
	});

	describe("deleteInterview", () => {
		it("DELETEs /api/jobs/:jobId/interviews/:interviewId and returns success", async () => {
			mockFetch.mockResolvedValue(makeResponse({ success: true }));
			const result = await api.deleteInterview(1, 5);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/5",
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(result.success).toBe(true);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.deleteInterview(1, 99)).rejects.toThrow("API error 400");
		});
	});

	const MOCK_QUESTION: InterviewQuestion = {
		id: 1,
		interview_id: 10,
		question_type: "behavioral",
		question_text: "Tell me about yourself",
		question_notes: null,
		difficulty: 3,
	};

	describe("getQuestions", () => {
		it("GETs /api/jobs/:jobId/interviews/:interviewId/questions and returns the list", async () => {
			mockFetch.mockResolvedValue(makeResponse([MOCK_QUESTION]));
			const result = await api.getQuestions(1, 10);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions",
				expect.objectContaining({
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(result).toEqual([MOCK_QUESTION]);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.getQuestions(1, 99)).rejects.toThrow("API error 400");
		});
	});

	describe("createQuestion", () => {
		it("POSTs to /api/jobs/:jobId/interviews/:interviewId/questions with JSON body and returns the created question", async () => {
			const formData: InterviewQuestionFormData = {
				question_type: "technical",
				question_text: "Explain closures in JavaScript",
				question_notes: null,
				difficulty: 4,
			};
			const created = { id: 2, interview_id: 10, ...formData };
			mockFetch.mockResolvedValue(makeResponse(created));
			const result = await api.createQuestion(1, 10, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(formData),
				}),
			);
			expect(result).toEqual(created);
		});
	});

	describe("updateQuestion", () => {
		it("PUTs to /api/jobs/:jobId/interviews/:interviewId/questions/:questionId and returns the updated question", async () => {
			const formData: InterviewQuestionFormData = {
				question_type: "behavioral",
				question_text: "Updated question text",
				question_notes: "Some notes",
				difficulty: 2,
			};
			const updated = { id: 1, interview_id: 10, ...formData };
			mockFetch.mockResolvedValue(makeResponse(updated));
			const result = await api.updateQuestion(1, 10, 1, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions/1",
				expect.objectContaining({
					method: "PUT",
					body: JSON.stringify(formData),
				}),
			);
			expect(result).toEqual(updated);
		});
	});

	describe("deleteQuestion", () => {
		it("DELETEs /api/jobs/:jobId/interviews/:interviewId/questions/:questionId and returns success", async () => {
			mockFetch.mockResolvedValue(makeResponse({ success: true }));
			const result = await api.deleteQuestion(1, 10, 1);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions/1",
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(result.success).toBe(true);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.deleteQuestion(1, 10, 99)).rejects.toThrow(
				"API error 400",
			);
		});
	});

	describe("searchInterviews", () => {
		const MOCK_ENRICHED = [
			{
				id: 1,
				job_id: 10,
				interview_type: "phone_screen",
				interview_dttm: "2026-03-15T14:00:00Z",
				interview_interviewers: null,
				interview_vibe: null,
				interview_notes: null,
				job: { id: 10, company: "Acme", role: "Engineer", link: "https://acme.com" },
			},
		];

		it("GETs /api/interviews with no params when no dates provided", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			const result = await api.searchInterviews();
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews",
				expect.objectContaining({
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(result).toEqual(MOCK_ENRICHED);
		});

		it("includes ?from param when from is provided", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			await api.searchInterviews("2026-01-01");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews?from=2026-01-01",
				expect.any(Object),
			);
		});

		it("includes ?to param when to is provided", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			await api.searchInterviews(undefined, "2026-12-31");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews?to=2026-12-31",
				expect.any(Object),
			);
		});

		it("includes both ?from and ?to params when both are provided", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			await api.searchInterviews("2026-01-01", "2026-12-31");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews?from=2026-01-01&to=2026-12-31",
				expect.any(Object),
			);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Unauthorized" }, false));
			await expect(api.searchInterviews()).rejects.toThrow("API error 400");
		});
	});

	describe("getStats", () => {
		const MOCK_STATS: StatsResponse = {
			totalApplications: 5,
			activePipeline: 2,
			offersReceived: 1,
			responseRate: 0.6,
			byStatus: [{ status: "Not started", count: 2 }],
			applicationsByWeek: [],
			avgDaysPerStage: [],
			transitions: [],
			statusOverTime: [],
			topCompanies: [],
		};

		it("GETs /api/stats?window=all and returns the stats", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_STATS));
			const result = await api.getStats("all");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/stats?window=all",
				expect.objectContaining({
					headers: { "Content-Type": "application/json" },
				}),
			);
			expect(result).toEqual(MOCK_STATS);
		});

		it("GETs /api/stats?window=30 when window is '30'", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_STATS));
			await api.getStats("30");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/stats?window=30",
				expect.any(Object),
			);
		});

		it("GETs /api/stats?window=90 when window is '90'", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_STATS));
			await api.getStats("90");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/stats?window=90",
				expect.any(Object),
			);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(
				makeResponse({ error: "Unauthorized" }, false),
			);
			await expect(api.getStats("all")).rejects.toThrow("API error 400");
		});
	});
});
