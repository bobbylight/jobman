import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "./api";
import type { Job, JobFormData } from "./types";

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
	referred_by: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
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
});
