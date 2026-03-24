import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
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

describe("api", () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal("fetch", mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
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
