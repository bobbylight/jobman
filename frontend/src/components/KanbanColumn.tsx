import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Box, Typography, Chip } from "@mui/material";
import { STATUS_COLORS } from "../constants";
import type { Job, JobStatus } from "../types";
import JobCard from "./JobCard";

interface Props {
	status: JobStatus;
	jobs: Job[];
	onCardClick: (job: Job) => void;
	onToggleFavorite: (job: Job) => void;
}

export default function KanbanColumn({
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
				display: "flex",
				flexDirection: "column",
				minWidth: 240,
				maxWidth: 280,
				flex: "0 0 260px",
				borderRadius: 0,
				overflow: "hidden",
				bgcolor: "rgba(0,0,0,0.025)",
				border: "1px solid rgba(0,0,0,0.08)",
				ml: "-1px",
				"&:first-of-type": { borderRadius: "10px 0 0 10px" },
				"&:last-of-type": { borderRadius: "0 10px 10px 0" },
			}}
		>
			{/* Colored top bar */}
			<Box sx={{ height: 3, bgcolor: color }} />

			{/* Column header */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					px: 1.5,
					py: 1,
					gap: 1,
				}}
			>
				<Typography
					variant="caption"
					fontWeight={700}
					sx={{
						textTransform: "uppercase",
						letterSpacing: 0.8,
						flexGrow: 1,
						color: "text.secondary",
					}}
				>
					{status}
				</Typography>
				<Chip
					label={jobs.length}
					size="small"
					sx={{
						height: 18,
						fontSize: 10,
						fontWeight: 700,
						bgcolor: `${color}22`,
						color: color,
						border: `1px solid ${color}44`,
						"& .MuiChip-label": { px: 0.75 },
					}}
				/>
			</Box>

			{/* Drop zone */}
			<Box
				ref={setNodeRef}
				sx={{
					flex: 1,
					minHeight: 80,
					p: 1,
					bgcolor: isOver ? `${color}33` : "transparent",
					borderTop: "1px solid rgba(0,0,0,0.05)",
					transition: "background-color 0.15s",
				}}
			>
				{jobs.map((job) => (
					<JobCard
						key={job.id}
						job={job}
						onClick={() => onCardClick(job)}
						onToggleFavorite={onToggleFavorite}
					/>
				))}
				{jobs.length === 0 && (
					<Typography
						variant="caption"
						color="text.disabled"
						sx={{ display: "block", textAlign: "center", mt: 2 }}
					>
						Drop here
					</Typography>
				)}
			</Box>
		</Box>
	);
}
