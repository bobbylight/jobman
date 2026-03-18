import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KanbanBoard from "./KanbanBoard";
import type { Job } from "../types";
import { STATUSES } from "../constants";

vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	DragOverlay: () => null,
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: () => {},
		transform: null,
		isDragging: false,
	}),
	useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
	pointerWithin: () => [],
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: { Translate: { toString: () => "" } },
}));

const makeJob = (overrides: Partial<Job> & Pick<Job, "id" | "status">): Job => ({
	company: "Acme",
	role: "Engineer",
	link: "https://acme.com",
	fit_score: null,
	salary: null,
	date_applied: null,
	recruiter: null,
	notes: null,
	referred_by: null,
	favorite: false,
	created_at: "2024-01-01T00:00:00.000Z",
	...overrides,
});

const DEFAULT_PROPS = {
	onStatusChange: vi.fn(),
	onCardClick: vi.fn(),
	onToggleFavorite: vi.fn(),
};

describe("KanbanBoard", () => {
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
			makeJob({ id: 1, status: "Not started", company: "Alpha" }),
			makeJob({ id: 2, status: "Offer!", company: "Beta" }),
			makeJob({ id: 3, status: "Not started", company: "Gamma" }),
		];
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={jobs} />);

		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
	});

	it("renders all provided jobs as cards", () => {
		const jobs: Job[] = [
			makeJob({ id: 1, status: "Not started", company: "Alpha" }),
			makeJob({ id: 2, status: "Resume submitted", company: "Beta" }),
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
