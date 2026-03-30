import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import KanbanColumn from "./KanbanColumn";
import type { Job } from "../types";

vi.mock("@dnd-kit/core", () => ({
	useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
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

const makeJob = (
	overrides: Partial<Job> & Pick<Job, "id" | "status">,
): Job => ({
	company: "Acme",
	role: "Engineer",
	link: "https://acme.com",
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
	...overrides,
});

const DEFAULT_PROPS = {
	status: "Not started" as const,
	onCardClick: vi.fn(),
	onToggleFavorite: vi.fn(),
};

describe("KanbanColumn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the column status label", () => {
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={[]} />);
		expect(screen.getByText("Not started")).toBeInTheDocument();
	});

	it("shows 0 count when no jobs", () => {
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={[]} />);
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("shows the job count", () => {
		const jobs = [
			makeJob({ id: 1, status: "Not started" }),
			makeJob({ id: 2, status: "Not started" }),
		];
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={jobs} />);
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("shows 'Drop here' placeholder when empty", () => {
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={[]} />);
		expect(screen.getByText("Drop here")).toBeInTheDocument();
	});

	it("does not show 'Drop here' when there are jobs", () => {
		render(
			<KanbanColumn
				{...DEFAULT_PROPS}
				jobs={[makeJob({ id: 1, status: "Not started" })]}
			/>,
		);
		expect(screen.queryByText("Drop here")).not.toBeInTheDocument();
	});

	it("renders a card for each job", () => {
		const jobs = [
			makeJob({ id: 1, status: "Not started", company: "Alpha Corp" }),
			makeJob({ id: 2, status: "Not started", company: "Beta Inc" }),
		];
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={jobs} />);
		expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
		expect(screen.getByText("Beta Inc")).toBeInTheDocument();
	});
});
