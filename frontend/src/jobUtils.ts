import type { Job, JobStatus } from "./types";

export function computeDateUpdates(
	job: Pick<Job, "date_phone_screen" | "date_last_onsite">,
	newStatus: JobStatus,
	now: string,
): Pick<Job, "date_phone_screen" | "date_last_onsite"> {
	if (newStatus === "Phone screen") {
		return { date_phone_screen: now, date_last_onsite: null };
	}
	if (newStatus === "Interviewing") {
		return { date_phone_screen: job.date_phone_screen, date_last_onsite: now };
	}
	if (newStatus === "Not started" || newStatus === "Resume submitted") {
		return { date_phone_screen: null, date_last_onsite: null };
	}
	return {
		date_phone_screen: job.date_phone_screen,
		date_last_onsite: job.date_last_onsite,
	};
}
