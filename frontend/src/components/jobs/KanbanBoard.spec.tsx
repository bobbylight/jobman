import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import KanbanBoard from "./KanbanBoard";
import type { Job } from "../../types";
import { STATUSES, STATUS_LABELS } from "../../constants";
import { makeJob } from "../../testUtils";

let capturedOnDragEnd: ((event: unknown) => void) | null = null;

function dragJobTo(job: Job, overId: string) {
	act(() => {
		capturedOnDragEnd!({
			active: { data: { current: { job } } },
			over: { id: overId },
		});
	});
}

vi.mock(
	import("@dnd-kit/core"),
	() =>
		({
			DndContext: ({
				children,
				onDragEnd,
			}: {
				children: React.ReactNode;
				onDragEnd: (event: unknown) => void;
			}) => {
				capturedOnDragEnd = onDragEnd;
				return <>{children}</>;
			},
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

const DEFAULT_PROPS = {
	onCardClick: vi.fn(),
	onStatusChange: vi.fn(),
	onToggleFavorite: vi.fn(),
};

describe("kanbanBoard", () => {
	it("renders all 6 status columns", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		for (const status of STATUSES) {
			expect(screen.getByText(STATUS_LABELS[status])).toBeInTheDocument();
		}
	});

	it("shows 'Drop here' placeholder in empty columns", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		const dropTargets = screen.getAllByText("Drop here");
		expect(dropTargets).toHaveLength(STATUSES.length);
	});

	it("places each job in the correct column", () => {
		const jobs: Job[] = [
			makeJob({ company: "Alpha", id: 1, status: "not_started" }),
			makeJob({ company: "Beta", id: 2, status: "offer" }),
			makeJob({ company: "Gamma", id: 3, status: "not_started" }),
		];
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={jobs} />);

		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
	});

	it("renders all provided jobs as cards", () => {
		const jobs: Job[] = [
			makeJob({ company: "Alpha", id: 1, status: "not_started" }),
			makeJob({ company: "Beta", id: 2, status: "applied" }),
		];
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={jobs} />);
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
	});

	it("shows no cards when jobs array is empty", () => {
		render(<KanbanBoard {...DEFAULT_PROPS} jobs={[]} />);
		expect(screen.queryByText("Acme")).not.toBeInTheDocument();
	});

	describe("leaving the Offer column", () => {
		beforeEach(() => vi.clearAllMocks());

		it("shows the LeaveOfferDialog when dragging a job with an offer out of the Offer column", () => {
			const job = makeJob({
				company: "Acme",
				has_offer: true,
				status: "offer",
			});
			render(<KanbanBoard {...DEFAULT_PROPS} jobs={[job]} />);

			dragJobTo(job, "applied");

			expect(screen.getByText("Remove offer details?")).toBeInTheDocument();
			expect(DEFAULT_PROPS.onStatusChange).not.toHaveBeenCalled();
		});

		it("proceeds immediately when dragging a job without an offer out of the Offer column", () => {
			const job = makeJob({
				company: "Acme",
				has_offer: false,
				status: "offer",
			});
			render(<KanbanBoard {...DEFAULT_PROPS} jobs={[job]} />);

			dragJobTo(job, "applied");

			expect(
				screen.queryByText("Remove offer details?"),
			).not.toBeInTheDocument();
			expect(DEFAULT_PROPS.onStatusChange).toHaveBeenCalledWith(job, "applied");
		});

		it("never shows the dialog when dragging a job into the Offer column", () => {
			const job = makeJob({
				company: "Acme",
				has_offer: false,
				status: "applied",
			});
			render(<KanbanBoard {...DEFAULT_PROPS} jobs={[job]} />);

			dragJobTo(job, "offer");

			expect(
				screen.queryByText("Remove offer details?"),
			).not.toBeInTheDocument();
			expect(DEFAULT_PROPS.onStatusChange).toHaveBeenCalledWith(job, "offer");
		});

		it("completes the status change when the dialog is confirmed", () => {
			const job = makeJob({
				company: "Acme",
				has_offer: true,
				status: "offer",
			});
			render(<KanbanBoard {...DEFAULT_PROPS} jobs={[job]} />);

			dragJobTo(job, "applied");
			fireEvent.click(
				screen.getByRole("button", { name: "Remove & Continue" }),
			);

			expect(DEFAULT_PROPS.onStatusChange).toHaveBeenCalledWith(job, "applied");
		});

		it("leaves the job unchanged when the dialog is cancelled", () => {
			const job = makeJob({
				company: "Acme",
				has_offer: true,
				status: "offer",
			});
			render(<KanbanBoard {...DEFAULT_PROPS} jobs={[job]} />);

			dragJobTo(job, "applied");
			fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

			expect(DEFAULT_PROPS.onStatusChange).not.toHaveBeenCalled();
		});
	});
});
