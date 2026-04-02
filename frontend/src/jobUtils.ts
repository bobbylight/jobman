import type { Job, JobStatus } from "./types";

export function computeDateUpdates(
	job: Pick<Job, "date_phone_screen" | "date_last_onsite">,
	_newStatus: JobStatus,
	_now: string,
): Pick<Job, "date_phone_screen" | "date_last_onsite"> {
	// TODO: In the future, we can prepopulate null dates with the current date, etc.
	return {
		date_phone_screen: job.date_phone_screen,
		date_last_onsite: job.date_last_onsite,
	};
}
