import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
	referred_by: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
};

describe("JobCard", () => {
	it("renders company name and role", () => {
		render(
			<JobCard job={BASE_JOB} onClick={vi.fn()} onToggleFavorite={vi.fn()} />,
		);
		expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		expect(screen.getByText("Software Engineer")).toBeInTheDocument();
	});

	it("shows salary chip when salary is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, salary: "$120k–$150k" }}
				onClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("$120k–$150k")).toBeInTheDocument();
	});

	it("does not show salary chip when salary is null", () => {
		render(
			<JobCard job={BASE_JOB} onClick={vi.fn()} onToggleFavorite={vi.fn()} />,
		);
		expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
	});

	it("shows fit score chip when fit_score is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, fit_score: "High" }}
				onClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("High")).toBeInTheDocument();
	});

	it("shows referral icon with name when referred_by is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, referred_by: "Jane Doe" }}
				onClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		// MUI v7 Tooltip sets aria-label on the child element instead of title
		expect(screen.getByTestId("PeopleIcon")).toHaveAttribute(
			"aria-label",
			"Referred by Jane Doe",
		);
	});

	it("does not show referral icon when referred_by is null", () => {
		render(
			<JobCard job={BASE_JOB} onClick={vi.fn()} onToggleFavorite={vi.fn()} />,
		);
		expect(screen.queryByTestId("PeopleIcon")).not.toBeInTheDocument();
	});

	it("shows recruiter name when recruiter is set", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, recruiter: "Jane Smith" }}
				onClick={vi.fn()}
				onToggleFavorite={vi.fn()}
			/>,
		);
		expect(screen.getByText("Recruiter: Jane Smith")).toBeInTheDocument();
	});

	it("shows Unfavorite tooltip when job is a favorite", () => {
		render(
			<JobCard
				job={{ ...BASE_JOB, favorite: true }}
				onClick={vi.fn()}
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
			<JobCard job={BASE_JOB} onClick={vi.fn()} onToggleFavorite={vi.fn()} />,
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
				onClick={vi.fn()}
				onToggleFavorite={onToggleFavorite}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Favorite" }));
		expect(onToggleFavorite).toHaveBeenCalledWith(BASE_JOB);
	});

	it("calls onClick when the card action area is clicked", () => {
		const onClick = vi.fn();
		render(
			<JobCard job={BASE_JOB} onClick={onClick} onToggleFavorite={vi.fn()} />,
		);
		fireEvent.click(screen.getByText("Acme Corp"));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("renders a link to the job posting", () => {
		render(
			<JobCard job={BASE_JOB} onClick={vi.fn()} onToggleFavorite={vi.fn()} />,
		);
		// MUI v7 Tooltip sets aria-label on the child element instead of title
		const link = screen.getByRole("link", { name: "Open job link" });
		expect(link).toHaveAttribute("href", "https://acme.example.com/job");
	});
});
