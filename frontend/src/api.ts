import type { Job, JobFormData } from "./types";

const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { "Content-Type": "application/json" },
		...options,
	});
	if (!res.ok) throw new Error(`API error ${res.status}`);
	return res.json() as Promise<T>;
}

export const api = {
	getJobs: () => request<Job[]>("/jobs"),
	createJob: (data: JobFormData) =>
		request<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
	updateJob: (id: number, data: Partial<JobFormData>) =>
		request<Job>(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
	deleteJob: (id: number) =>
		request<{ success: boolean }>(`/jobs/${id}`, { method: "DELETE" }),
};
