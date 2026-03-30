import type { Job, JobFormData, User } from "./types";

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
	createJob: (data: JobFormData) =>
		request<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),
	updateJob: (id: number, data: Partial<JobFormData>) =>
		request<Job>(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
	deleteJob: (id: number) =>
		request<{ success: boolean }>(`/jobs/${id}`, { method: "DELETE" }),
};
