import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
	Card,
	CardContent,
	CardActionArea,
	Typography,
	Chip,
	Box,
	IconButton,
	Tooltip,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PeopleIcon from "@mui/icons-material/People";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { FIT_SCORE_COLORS } from "../constants";
import type { Job } from "../types";

interface Props {
	job: Job;
	onClick: () => void;
	onToggleFavorite: (job: Job) => void;
}

export default function JobCard({ job, onClick, onToggleFavorite }: Props) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: String(job.id),
			data: { job },
		});

	const style = {
		transform: CSS.Translate.toString(transform),
		opacity: isDragging ? 0.4 : 1,
		cursor: isDragging ? "grabbing" : "grab",
	};

	return (
		<Card
			ref={setNodeRef}
			style={style}
			elevation={isDragging ? 0 : 1}
			sx={{ mb: 1.5, position: "relative", "&:hover": { boxShadow: 3 } }}
			{...attributes}
		>
			<Box
				{...listeners}
				sx={{
					position: "absolute",
					top: 4,
					left: 4,
					zIndex: 1,
					color: "text.disabled",
					cursor: isDragging ? "grabbing" : "grab",
					display: "flex",
					alignItems: "center",
					touchAction: "none",
				}}
			>
				<DragIndicatorIcon sx={{ fontSize: 16 }} />
			</Box>

			<Tooltip title={job.favorite ? "Unfavorite" : "Favorite"}>
				<IconButton
					size="small"
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => {
						e.stopPropagation();
						onToggleFavorite(job);
					}}
					sx={{
						position: "absolute",
						top: 4,
						right: 4,
						zIndex: 1,
						color: job.favorite ? "warning.main" : "text.disabled",
					}}
				>
					{job.favorite ? (
						<StarIcon fontSize="small" />
					) : (
						<StarBorderIcon fontSize="small" />
					)}
				</IconButton>
			</Tooltip>

			<CardActionArea
				onPointerDown={(e) => e.stopPropagation()}
				onClick={onClick}
				sx={{ p: 0 }}
			>
				<CardContent sx={{ pb: "12px !important", pt: 1.5, pl: 3.5, pr: 4 }}>
					<Typography variant="subtitle2" fontWeight={700} noWrap>
						{job.company}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						noWrap
						sx={{ mb: 0.75 }}
					>
						{job.role}
					</Typography>

					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							gap: 0.5,
							alignItems: "center",
						}}
					>
						{job.salary && (
							<Chip label={job.salary} size="small" variant="outlined" />
						)}
						{job.fit_score && (
							<Chip
								label={job.fit_score}
								size="small"
								color={FIT_SCORE_COLORS[job.fit_score]}
								variant="outlined"
							/>
						)}
						{job.referred_by && (
							<Tooltip title={`Referred by ${job.referred_by}`}>
								<PeopleIcon fontSize="small" color="primary" />
							</Tooltip>
						)}
						<Tooltip title="Open job link">
							<IconButton
								size="small"
								component="a"
								href={job.link}
								target="_blank"
								rel="noopener noreferrer"
								onPointerDown={(e) => e.stopPropagation()}
								onClick={(e) => e.stopPropagation()}
								sx={{ ml: "auto", color: "text.disabled" }}
							>
								<OpenInNewIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>

					{job.recruiter && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ mt: 0.5, display: "block" }}
						>
							Recruiter: {job.recruiter}
						</Typography>
					)}
				</CardContent>
			</CardActionArea>
		</Card>
	);
}
