import React from "react";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import JobCard from "./JobCard";
import type { Job } from "../types";

const baseJob: Job = {
	id: 1,
	company: "Acme Corp",
	role: "Engineer",
	link: "https://example.com",
	status: "Rejected/Withdrawn",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: "Rejected",
	referred_by: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2025-01-01T00:00:00",
	updated_at: "2025-06-15T00:00:00",
};

function renderCard(job: Job) {
	return render(
		<DndContext>
			<JobCard job={job} onClick={() => {}} onToggleFavorite={() => {}} />
		</DndContext>,
	);
}

describe("JobCard — Rejected/Withdrawn date label", () => {
	it("displays 'Last updated' with the formatted updated_at date", () => {
		renderCard(baseJob);
		expect(screen.getByText(/Last updated/)).toBeInTheDocument();
		expect(screen.getByText(/Jun 15, 2025/)).toBeInTheDocument();
	});

	it("renders label without a date when updated_at is empty", () => {
		const job = { ...baseJob, updated_at: "" };
		renderCard(job);
		expect(screen.getByText("Last updated")).toBeInTheDocument();
	});
});
