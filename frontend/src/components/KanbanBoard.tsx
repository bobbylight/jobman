import React, { useState, useMemo, memo } from "react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Box } from "@mui/material";
import { STATUSES } from "../constants";
import type { Job, JobStatus } from "../types";
import KanbanColumn from "./KanbanColumn";
import JobCard from "./JobCard";

interface Props {
	jobs: Job[];
	onStatusChange: (job: Job, newStatus: JobStatus) => void;
	onCardClick: (job: Job) => void;
	onToggleFavorite: (job: Job) => void;
}

export default memo(function KanbanBoard({
	jobs,
	onStatusChange,
	onCardClick,
	onToggleFavorite,
}: Props) {
	const [activeJob, setActiveJob] = useState<Job | null>(null);

	const byStatus = useMemo(
		() =>
			STATUSES.reduce<Record<JobStatus, Job[]>>(
				(acc, s) => {
					acc[s] = jobs.filter((j) => j.status === s);
					return acc;
				},
				{} as Record<JobStatus, Job[]>,
			),
		[jobs],
	);

	function handleDragStart({ active }: DragStartEvent) {
		setActiveJob(
			(active.data.current as { job: Job } | undefined)?.job ?? null,
		);
	}

	function handleDragEnd({ active, over }: DragEndEvent) {
		setActiveJob(null);
		if (!over) return;
		const job = (active.data.current as { job: Job } | undefined)?.job;
		if (!job) return;
		const newStatus = over.id as JobStatus;
		if (newStatus === job.status) return;
		onStatusChange(job, newStatus);
	}

	return (
		<DndContext
			collisionDetection={pointerWithin}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<Box
				sx={{
					display: "flex",
					gap: 0,
					overflowX: "auto",
					pb: 2,
					px: 3,
					alignItems: "stretch",
					minHeight: "calc(100vh - 80px)",
				}}
			>
				{STATUSES.map((status) => (
					<KanbanColumn
						key={status}
						status={status}
						jobs={byStatus[status]}
						onCardClick={onCardClick}
						onToggleFavorite={onToggleFavorite}
					/>
				))}
			</Box>

			<DragOverlay dropAnimation={null}>
				{activeJob ? (
					<JobCard
						job={activeJob}
						onCardClick={() => {}}
						onToggleFavorite={() => {}}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	);
});
