import React, { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Box, Chip, Typography } from "@mui/material";
import { STATUS_COLORS } from "../constants";
import type { Job, JobStatus } from "../types";
import JobCard from "./JobCard";

interface Props {
	status: JobStatus;
	jobs: Job[];
	onCardClick: (job: Job) => void;
	onToggleFavorite: (job: Job) => void;
}

export default memo(function KanbanColumn({
	status,
	jobs,
	onCardClick,
	onToggleFavorite,
}: Props) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const color = STATUS_COLORS[status];

	return (
		<Box
			sx={{
				"&:first-of-type": { borderRadius: "10px 0 0 10px" },
				"&:last-of-type": { borderRadius: "0 10px 10px 0" },
				bgcolor: "rgba(0,0,0,0.025)",
				border: "1px solid rgba(0,0,0,0.08)",
				borderRadius: 0,
				display: "flex",
				flex: "0 0 260px",
				flexDirection: "column",
				maxWidth: 280,
				minWidth: 240,
				ml: "-1px",
				overflow: "hidden",
			}}
		>
			{/* Colored top bar */}
			<Box sx={{ bgcolor: color, height: 3 }} />

			{/* Column header */}
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					gap: 1,
					px: 1.5,
					py: 1,
				}}
			>
				<Typography
					variant="caption"
					fontWeight={700}
					sx={{
						color: "text.secondary",
						flexGrow: 1,
						letterSpacing: 0.8,
						textTransform: "uppercase",
					}}
				>
					{status}
				</Typography>
				<Chip
					label={jobs.length}
					size="small"
					sx={{
						"& .MuiChip-label": { px: 0.75 },
						bgcolor: `${color}22`,
						border: `1px solid ${color}44`,
						color,
						fontSize: 10,
						fontWeight: 700,
						height: 18,
					}}
				/>
			</Box>

			{/* Drop zone */}
			<Box
				ref={setNodeRef}
				sx={{
					bgcolor: isOver ? `${color}33` : "transparent",
					borderTop: "1px solid rgba(0,0,0,0.05)",
					flex: 1,
					minHeight: 80,
					p: 1,
					transition: "background-color 0.15s",
				}}
			>
				{jobs.map((job) => (
					<JobCard
						key={job.id}
						job={job}
						onCardClick={onCardClick}
						onToggleFavorite={onToggleFavorite}
					/>
				))}
				{jobs.length === 0 && (
					<Typography
						variant="caption"
						color="text.disabled"
						sx={{ display: "block", mt: 2, textAlign: "center" }}
					>
						Drop here
					</Typography>
				)}
			</Box>
		</Box>
	);
});
