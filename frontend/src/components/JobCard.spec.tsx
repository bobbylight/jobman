import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import JobCard from "./JobCard";
import type { Job } from "../types";

vi.mock("@dnd-kit/core", () => ({
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: () => {},
		transform: null,
		isDragging: false,
	}),
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: { Translate: { toString: () => "" } },
}));

const BASE_JOB: Job = {
	id: 1,
	company: "Acme Corp",
	role: "Software Engineer",
	link: "https://acme.example.com/job",
	status: "Not started",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: null,
	referred_by: null,
	date_phone_screen: null,
	date_last_onsite: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	updated_at: "2024-01-01T00:00:00.000Z",
};

describe("JobCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders company name and role", () => {
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		expect(screen.getByText("Software Engineer")).toBeInTheDocument();
	});

	it("shows salary chip when salary is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, salary: "$120k–$150k" }}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("$120k–$150k")).toBeInTheDocument();
	});

	it("shows $??? chip when salary is null", () => {
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("$???")).toBeInTheDocument();
	});

	it("shows fit score indicator when fit_score is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, fit_score: "High" }}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByLabelText("Fit: High")).toBeInTheDocument();
	});

	it("shows referral chip with name when referred_by is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, referred_by: "Jane Doe" }}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("Jane Doe")).toBeInTheDocument();
	});

	it("does not show referral icon when referred_by is null", () => {
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.queryByTestId("PeopleIcon")).not.toBeInTheDocument();
	});

	it("shows recruiter name when recruiter is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, recruiter: "Jane Smith" }}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("Recruiter: Jane Smith")).toBeInTheDocument();
	});

	it("shows Unfavorite tooltip when job is a favorite", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, favorite: true }}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		// MUI v7 Tooltip sets aria-label on the child element instead of title
		expect(
			screen.getByRole("button", { name: "Unfavorite" }),
		).toBeInTheDocument();
	});

	it("shows Favorite tooltip when job is not a favorite", () => {
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		// MUI v7 Tooltip sets aria-label on the child element instead of title
		expect(
			screen.getByRole("button", { name: "Favorite" }),
		).toBeInTheDocument();
	});

	it("calls onToggleFavorite with the job when the star button is clicked", () => {
		const onToggleFavorite = vi.fn();
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={onToggleFavorite}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Favorite" }));
		expect(onToggleFavorite).toHaveBeenCalledWith(BASE_JOB);
	});

	it("calls onCardClick with the job when the card action area is clicked", () => {
		const onCardClick = vi.fn();
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={onCardClick}
				onToggleFavorite={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("Software Engineer"));
		expect(onCardClick).toHaveBeenCalledWith(BASE_JOB);
	});

	it("renders a link to the job posting", () => {
		render(
			<JobCard
				job={BASE_JOB}
				onCardClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		// MUI v7 Tooltip sets aria-label on the child element instead of title
		const link = screen.getByRole("link", { name: "Open job listing" });
		expect(link).toHaveAttribute("href", "https://acme.example.com/job");
	});

	describe("Rejected/Withdrawn date label", () => {
		it("displays 'Last updated' with the formatted updated_at date", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Rejected/Withdrawn",
						updated_at: "2025-06-15T00:00:00",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText(/Last updated/)).toBeInTheDocument();
			expect(screen.getByText(/Jun 15, 2025/)).toBeInTheDocument();
		});

		it("renders label without a date when updated_at is empty", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, status: "Rejected/Withdrawn", updated_at: "" }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText("Last updated")).toBeInTheDocument();
		});
	});
});
