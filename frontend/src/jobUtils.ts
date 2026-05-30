import type { Job, JobStatus } from "./types";

const GHOSTABLE_STATUSES = new Set<JobStatus>([
	"applied",
	"phone_screen",
	"interviewing",
]);
const GHOSTED_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Returns true if a job is in an active status but hasn't had any company
 * communication (date_applied, date_phone_screen, date_last_onsite) in > 30 days.
 */
export function isPossiblyGhosted(job: Job): boolean {
	if (!GHOSTABLE_STATUSES.has(job.status)) {
		return false;
	}
	const timestamps = [
		job.date_applied,
		job.date_phone_screen,
		job.date_last_onsite,
	]
		.filter((d): d is string => d !== null)
		.map((d) => new Date(d).getTime())
		.filter((t) => !isNaN(t));
	if (timestamps.length === 0) {
		return false;
	}
	return Date.now() - Math.max(...timestamps) > GHOSTED_THRESHOLD_MS;
}

export function formatTime(dttm: string): string {
	const d = new Date(dttm);
	if (isNaN(d.getTime())) {
		return dttm;
	}
	return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
}
