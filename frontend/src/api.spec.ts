import { api, setUnauthorizedHandler } from "./api";
import type {
	InterviewQuestion,
	InterviewQuestionFormData,
	Job,
	JobFormData,
	StatsResponse,
} from "./types";

const makeResponse = (body: unknown, ok = true) => ({
	json: () => Promise.resolve(body),
	ok,
	status: ok ? 200 : 400,
});

const MOCK_JOB: Job = {
	company: "Acme",
	created_at: "2024-01-01T00:00:00.000Z",
	date_applied: null,
	date_last_onsite: null,
	date_phone_screen: null,
	ending_substatus: null,
	favorite: false,
	fit_score: null,
	id: 1,
	job_description: null,
	link: "https://acme.com/job",
	notes: null,
	recruiter: null,
	referred_by: null,
	role: "Engineer",
	salary: null,
	status: "Not started",
	tags: [],
	updated_at: "2024-01-01T00:00:00.000Z",
};

const MOCK_USER = {
	avatarUrl: null,
	displayName: "Test User",
	email: "test@example.com",
	id: 1,
};

describe("API module", () => {
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
				json: () => Promise.resolve(MOCK_USER),
				ok: true,
				status: 200,
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
				json: () => Promise.resolve(null),
				ok: false,
				status: 401,
			});
			const result = await api.getMe();
			expect(result).toBeNull();
		});

		it("throws when the response is an unexpected error status", async () => {
			mockFetch.mockResolvedValue({
				json: () => Promise.resolve({}),
				ok: false,
				status: 500,
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
			expect(result.success).toBeTruthy();
		});
	});

	describe(setUnauthorizedHandler, () => {
		afterEach(() => {
			// Reset so the handler doesn't leak into other tests
			setUnauthorizedHandler(() => {});
		});

		it("calls the registered handler when any request receives a 401", async () => {
			const handler = vi.fn();
			setUnauthorizedHandler(handler);
			mockFetch.mockResolvedValue({
				json: () => Promise.resolve({}),
				ok: false,
				status: 401,
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
		it("fetches GET /api/jobs?view=summary and returns the parsed JSON", async () => {
			mockFetch.mockResolvedValue(makeResponse([MOCK_JOB]));
			const result = await api.getJobs();
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs?view=summary",
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
				date_applied: null,
				date_last_onsite: null,
				date_phone_screen: null,
				ending_substatus: null,
				favorite: false,
				fit_score: null,
				job_description: null,
				link: "https://acme.com/job",
				notes: null,
				recruiter: null,
				referred_by: null,
				role: "Engineer",
				salary: null,
				status: "Not started",
				tags: [],
				updated_at: "",
			};
			const result = await api.createJob(formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs",
				expect.objectContaining({
					body: JSON.stringify(formData),
					method: "POST",
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
					body: JSON.stringify({ company: "Updated" }),
					method: "PUT",
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
			expect(result.success).toBeTruthy();
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
					interview_dttm: "2024-03-12T14:00",
					interview_interviewers: "Jane",
					interview_notes: null,
					interview_stage: "phone_screen",
					interview_vibe: "casual",
					job_id: 1,
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
				interview_dttm: "2024-03-19T10:00",
				interview_interviewers: "Alice",
				interview_notes: null,
				interview_stage: "onsite" as const,
				interview_type: null,
				interview_vibe: "intense" as const,
			};
			const created = { id: 2, job_id: 1, ...formData };
			mockFetch.mockResolvedValue(makeResponse(created));
			const result = await api.createInterview(1, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews",
				expect.objectContaining({
					body: JSON.stringify(formData),
					method: "POST",
				}),
			);
			expect(result).toEqual(created);
		});
	});

	describe("updateInterview", () => {
		it("PUTs to /api/jobs/:jobId/interviews/:interviewId and returns the updated interview", async () => {
			const formData = {
				interview_dttm: "2024-03-19T10:00",
				interview_interviewers: "Bob",
				interview_notes: "Updated notes",
				interview_stage: "onsite" as const,
				interview_type: null,
				interview_vibe: null,
			};
			const updated = { id: 5, job_id: 1, ...formData };
			mockFetch.mockResolvedValue(makeResponse(updated));
			const result = await api.updateInterview(1, 5, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/5",
				expect.objectContaining({
					body: JSON.stringify(formData),
					method: "PUT",
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
			expect(result.success).toBeTruthy();
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.deleteInterview(1, 99)).rejects.toThrow("API error 400");
		});
	});

	const MOCK_QUESTION: InterviewQuestion = {
		difficulty: 3,
		id: 1,
		interview_id: 10,
		question_notes: null,
		question_text: "Tell me about yourself",
		question_type: "behavioral",
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
				difficulty: 4,
				question_notes: null,
				question_text: "Explain closures in JavaScript",
				question_type: "technical",
			};
			const created = { id: 2, interview_id: 10, ...formData };
			mockFetch.mockResolvedValue(makeResponse(created));
			const result = await api.createQuestion(1, 10, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions",
				expect.objectContaining({
					body: JSON.stringify(formData),
					method: "POST",
				}),
			);
			expect(result).toEqual(created);
		});
	});

	describe("updateQuestion", () => {
		it("PUTs to /api/jobs/:jobId/interviews/:interviewId/questions/:questionId and returns the updated question", async () => {
			const formData: InterviewQuestionFormData = {
				difficulty: 2,
				question_notes: "Some notes",
				question_text: "Updated question text",
				question_type: "behavioral",
			};
			const updated = { id: 1, interview_id: 10, ...formData };
			mockFetch.mockResolvedValue(makeResponse(updated));
			const result = await api.updateQuestion(1, 10, 1, formData);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/jobs/1/interviews/10/questions/1",
				expect.objectContaining({
					body: JSON.stringify(formData),
					method: "PUT",
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
			expect(result.success).toBeTruthy();
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(makeResponse({ error: "Not found" }, false));
			await expect(api.deleteQuestion(1, 10, 99)).rejects.toThrow(
				"API error 400",
			);
		});
	});

	describe("loadMoreInterviews", () => {
		const MOCK_ENRICHED = [
			{
				id: 1,
				interview_dttm: "2026-04-20T10:00:00Z",
				interview_interviewers: null,
				interview_notes: null,
				interview_stage: "phone_screen",
				interview_vibe: null,
				job: {
					company: "Acme",
					id: 10,
					link: "https://acme.com",
					role: "Engineer",
				},
				job_id: 10,
			},
		];

		it("GETs /api/interviews?after=<dttm>&limit=10 by default", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			const result = await api.loadMoreInterviews("2026-04-15T10:00:00Z");
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews?after=2026-04-15T10%3A00%3A00Z&limit=10",
				expect.any(Object),
			);
			expect(result).toEqual(MOCK_ENRICHED);
		});

		it("includes the specified limit when provided", async () => {
			mockFetch.mockResolvedValue(makeResponse(MOCK_ENRICHED));
			await api.loadMoreInterviews("2026-04-15T10:00:00Z", 5);
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/interviews?after=2026-04-15T10%3A00%3A00Z&limit=5",
				expect.any(Object),
			);
		});

		it("throws when the response is not ok", async () => {
			mockFetch.mockResolvedValue(
				makeResponse({ error: "Unauthorized" }, false),
			);
			await expect(
				api.loadMoreInterviews("2026-04-15T10:00:00Z"),
			).rejects.toThrow("API error 400");
		});
	});

	describe("searchInterviews", () => {
		const MOCK_ENRICHED = [
			{
				id: 1,
				interview_dttm: "2026-03-15T14:00:00Z",
				interview_interviewers: null,
				interview_notes: null,
				interview_stage: "phone_screen",
				interview_vibe: null,
				job: {
					company: "Acme",
					id: 10,
					link: "https://acme.com",
					role: "Engineer",
				},
				job_id: 10,
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
			mockFetch.mockResolvedValue(
				makeResponse({ error: "Unauthorized" }, false),
			);
			await expect(api.searchInterviews()).rejects.toThrow("API error 400");
		});
	});

	describe("getStats", () => {
		const MOCK_STATS: StatsResponse = {
			activePipeline: 2,
			applicationsByWeek: [],
			avgDaysPerStage: [],
			byStatus: [{ status: "Not started", count: 2 }],
			offersReceived: 1,
			responseRate: 0.6,
			statusOverTime: [],
			topCompanies: [],
			totalApplications: 5,
			transitions: [],
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
