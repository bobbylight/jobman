import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Box, Typography, Paper, Badge } from "@mui/material";
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
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
				<Box
					sx={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						bgcolor: color,
						flexShrink: 0,
					}}
				/>
				<Typography
					variant="caption"
					fontWeight={700}
					color="text.secondary"
					sx={{ textTransform: "uppercase", letterSpacing: 0.8, flexGrow: 1 }}
				>
					{status}
				</Typography>
				<Badge
					badgeContent={jobs.length}
					color="default"
					sx={{
						"& .MuiBadge-badge": {
							fontSize: 10,
							height: 16,
							minWidth: 16,
							bgcolor: color,
							color: "#fff",
						},
					}}
				/>
			</Box>

			<Paper
				ref={setNodeRef}
				elevation={0}
				sx={{
					flex: 1,
					minHeight: 80,
					p: 1,
					bgcolor: isOver ? "action.hover" : "background.paper",
					borderRadius: 2,
					border: "2px solid",
					borderColor: isOver ? color : "transparent",
					transition: "border-color 0.15s, background-color 0.15s",
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
			</Paper>
		</Box>
	);
}
