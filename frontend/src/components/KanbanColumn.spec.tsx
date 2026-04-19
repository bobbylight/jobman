import React from "react";
import { render, screen } from "@testing-library/react";
import KanbanColumn from "./KanbanColumn";
import type { Job } from "../types";

vi.mock(
	import("@dnd-kit/core"),
	() =>
		({
			useDraggable: () => ({
				attributes: {},
				listeners: {},
				setNodeRef: () => {},
				transform: null,
				isDragging: false,
			}),
			useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
		}) as any,
);

vi.mock(
	import("@dnd-kit/utilities"),
	() =>
		({
			CSS: { Translate: { toString: () => "" } },
		}) as any,
);

const makeJob = (
	overrides: Partial<Job> & Pick<Job, "id" | "status">,
): Job => ({
	company: "Acme",
	created_at: "2024-01-01T00:00:00.000Z",
	date_applied: null,
	date_last_onsite: null,
	date_phone_screen: null,
	ending_substatus: null,
	favorite: false,
	fit_score: null,
	job_description: null,
	link: "https://acme.com",
	notes: null,
	recruiter: null,
	referred_by: null,
	role: "Engineer",
	salary: null,
	tags: [],
	updated_at: "2024-01-01T00:00:00.000Z",
	...overrides,
});

const DEFAULT_PROPS = {
	onCardClick: vi.fn(),
	onToggleFavorite: vi.fn(),
	status: "Not started" as const,
};

describe(KanbanColumn, () => {
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
			makeJob({ company: "Alpha Corp", id: 1, status: "Not started" }),
			makeJob({ company: "Beta Inc", id: 2, status: "Not started" }),
		];
		render(<KanbanColumn {...DEFAULT_PROPS} jobs={jobs} />);
		expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
		expect(screen.getByText("Beta Inc")).toBeInTheDocument();
	});
});
