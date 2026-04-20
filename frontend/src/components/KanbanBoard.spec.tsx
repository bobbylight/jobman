import React from "react";
import { render, screen } from "@testing-library/react";
import KanbanBoard from "./KanbanBoard";
import type { Job } from "../types";
import { STATUSES } from "../constants";

vi.mock(
	import("@dnd-kit/core"),
	() =>
		({
			DndContext: ({ children }: { children: React.ReactNode }) => (
				<>{children}</>
			),
			DragOverlay: () => null,
			pointerWithin: () => [],
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
	onStatusChange: vi.fn(),
	onToggleFavorite: vi.fn(),
};

describe(KanbanBoard, () => {
	it("renders all 6 status columns", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		for (const status of STATUSES) {
			expect(screen.getByText(status)).toBeInTheDocument();
		}
	});

	it("shows 'Drop here' placeholder in empty columns", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		const dropTargets = screen.getAllByText("Drop here");
		expect(dropTargets).toHaveLength(STATUSES.length);
	});

	it("places each job in the correct column", () => {
		const jobs: Job[] = [
			makeJob({ company: "Alpha", id: 1, status: "Not started" }),
			makeJob({ company: "Beta", id: 2, status: "Offer!" }),
			makeJob({ company: "Gamma", id: 3, status: "Not started" }),
		];
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={jobs} />);

		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
	});

	it("renders all provided jobs as cards", () => {
		const jobs: Job[] = [
			makeJob({ company: "Alpha", id: 1, status: "Not started" }),
			makeJob({ company: "Beta", id: 2, status: "Applied" }),
		];
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={jobs} />);
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
	});

	it("shows no cards when jobs array is empty", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		expect(screen.queryByText("Acme")).not.toBeInTheDocument();
	});
});
