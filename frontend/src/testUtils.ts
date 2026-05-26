import type { Job } from "./types";

export const BASE_JOB: Job = {
	id: 1,
	company: "Acme Corp",
	role: "Software Engineer",
	link: "https://acme.example.com/job",
	status: "Not started",
	ending_substatus: null,
	fit_score: null,
	salary: null,
	date_applied: null,
	date_phone_screen: null,
	date_last_onsite: null,
	date_offer_extended: null,
	recruiter: null,
	notes: null,
	job_description: null,
	referred_by: null,
	tags: [],
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
};

export function makeJob(overrides: Partial<Job> = {}): Job {
	return { ...BASE_JOB, ...overrides };
}
