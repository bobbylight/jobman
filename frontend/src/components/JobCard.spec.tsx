import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import JobCard from "./JobCard";
import type { Job } from "../types";
vi.mock(
	import("../useCompanyLogo"),
	() =>
		({
			useCompanyLogo: vi.fn(() => null),
		}) as any,
);

vi.mock(
	import("@dnd-kit/core"),
	() =>
		({
			useDraggable: () => ({
				attributes: {},
				isDragging: false,
				listeners: {},
				setNodeRef: () => {},
				transform: null,
			}),
		}) as any,
);

vi.mock(
	import("@dnd-kit/utilities"),
	() =>
		({
			CSS: { Translate: { toString: () => "" } },
		}) as any,
);

const BASE_JOB: Job = {
	company: "Acme Corp",
	created_at: "2024-01-01T00:00:00.000Z",
	date_applied: null,
	date_last_onsite: null,
	date_phone_screen: null,
	ending_substatus: null,
	favorite: false,
	fit_score: null,
	id: 1,
	job_description: null,
	link: "https://acme.example.com/job",
	notes: null,
	recruiter: null,
	referred_by: null,
	role: "Software Engineer",
	salary: null,
	status: "Not started",
	tags: [],
	updated_at: "2024-01-01T00:00:00.000Z",
};

describe(JobCard, () => {
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

	describe("tags", () => {
		it("renders tag chips when tags are set", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, tags: ["remote", "faang"] }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText("Remote")).toBeInTheDocument();
			expect(screen.getByText("FAANG")).toBeInTheDocument();
		});

		it("does not render tag chips when tags are empty", () => {
			render(
				<JobCard
					job={BASE_JOB}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("Remote")).not.toBeInTheDocument();
		});
	});

	describe("possibly ghosted chip", () => {
		// Pin time so dates relative to "now" are deterministic
		const NOW = new Date("2026-01-31T00:00:00.000Z").getTime();

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("shows 'Possibly ghosted' chip when Applied with old date_applied", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, status: "Applied", date_applied: "2024-12-31" }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText("👻 Possibly ghosted")).toBeInTheDocument();
		});

		it("shows 'Possibly ghosted' chip for Phone screen with old date_phone_screen", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Phone screen",
						date_phone_screen: "2024-12-31",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText("👻 Possibly ghosted")).toBeInTheDocument();
		});

		it("shows 'Possibly ghosted' chip for Interviewing with old date_last_onsite", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Interviewing",
						date_last_onsite: "2024-12-31",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.getByText("👻 Possibly ghosted")).toBeInTheDocument();
		});

		it("does not show chip when date is within 30 days", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, status: "Applied", date_applied: "2026-01-20" }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});

		it("does not show chip for 'Not started' even with old dates", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Not started",
						date_applied: "2024-12-31",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});

		it("does not show chip for 'Offer!' even with old dates", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, status: "Offer!", date_applied: "2024-12-31" }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});

		it("does not show chip for 'Rejected/Withdrawn' even with old dates", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Rejected/Withdrawn",
						date_applied: "2024-12-31",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});

		it("does not show chip when all dates are null", () => {
			render(
				<JobCard
					job={{ ...BASE_JOB, status: "Applied" }}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});

		it("does not show chip when most recent date is within 30 days even if others are old", () => {
			render(
				<JobCard
					job={{
						...BASE_JOB,
						status: "Phone screen",
						date_applied: "2024-12-31",
						date_phone_screen: "2026-01-20",
					}}
					onCardClick={vi.fn()}
					onToggleFavorite={vi.fn()}
				/>,
			);
			expect(screen.queryByText("👻 Possibly ghosted")).not.toBeInTheDocument();
		});
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
