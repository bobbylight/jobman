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
import type { FitScore, Job, JobStatus } from "../types";

function formatDate(dateStr: string | null): string | null {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return null;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

const STATUS_DATE_LABEL: Record<
	JobStatus,
	{ label: string; getDate: (job: Job) => string | null }
> = {
	"Not started": {
		label: "Last updated",
		getDate: (job) => formatDate(job.created_at),
	},
	"Resume submitted": {
		label: "Applied",
		getDate: (job) => formatDate(job.date_applied),
	},
	"Initial interview": {
		label: "Phone screen",
		getDate: (job) => formatDate(job.date_phone_screen),
	},
	"Final round interview": {
		label: "Last onsite",
		getDate: (job) => formatDate(job.date_last_onsite),
	},
	"Offer!": { label: "Last updated", getDate: () => null },
	"Rejected/Withdrawn": {
		label: "Last updated",
		getDate: (job) => formatDate(job.updated_at),
	},
};

// Maps each fit score to a number of filled bars (out of 5)
const FIT_SCORE_BARS: Record<FitScore, number> = {
	"Not sure": 0,
	"Very Low": 1,
	Low: 2,
	Medium: 3,
	High: 4,
	"Very High": 5,
};

// Maps MUI color names to actual hex values for the bar fill
const FIT_SCORE_HEX: Record<FitScore, string> = {
	"Not sure": "#9e9e9e",
	"Very Low": "#ef5350",
	Low: "#ff7043",
	Medium: "#ffa726",
	High: "#66bb6a",
	"Very High": "#43a047",
};

function FitScoreBars({ score }: { score: FitScore }) {
	const filled = FIT_SCORE_BARS[score];
	const color = FIT_SCORE_HEX[score];

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "flex-end",
				gap: "2px",
				height: 14,
				flexShrink: 0,
			}}
		>
			{[1, 2, 3, 4, 5].map((bar) => (
				<Box
					key={bar}
					sx={{
						width: 3,
						height: `${(bar / 5) * 100}%`,
						borderRadius: "1px",
						bgcolor: bar <= filled ? color : "rgba(0,0,0,0.15)",
					}}
				/>
			))}
		</Box>
	);
}

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

	const hasChips = job.salary || job.referred_by;

	const style = {
		transform: CSS.Translate.toString(transform),
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<Card
			ref={setNodeRef}
			style={style}
			elevation={0}
			sx={{
				mb: 1.5,
				"&:hover": {
					boxShadow: `0 0 0 1px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.1)`,
				},
				transition: "box-shadow 0.15s",
			}}
			{...attributes}
		>
			{/* Card header — full row is the drag handle */}
			<Box
				{...listeners}
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.5,
					px: 1,
					py: 0.5,
					bgcolor: "rgba(0,0,0,0.035)",
					borderBottom: "1px solid rgba(0,0,0,0.07)",
					cursor: isDragging ? "grabbing" : "grab",
					touchAction: "none",
				}}
			>
				<DragIndicatorIcon
					sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }}
				/>
				<Typography
					variant="subtitle2"
					fontWeight={700}
					noWrap
					sx={{ flex: 1, minWidth: 0 }}
				>
					{job.company}
				</Typography>

				{job.fit_score && (
					<Tooltip title={`Fit: ${job.fit_score}`} placement="top">
						<Box
							onPointerDown={(e) => e.stopPropagation()}
							sx={{ display: "flex", alignItems: "center", cursor: "default" }}
						>
							<FitScoreBars score={job.fit_score} />
						</Box>
					</Tooltip>
				)}

				<Tooltip title="Open job listing">
					<IconButton
						size="small"
						component="a"
						href={job.link}
						target="_blank"
						rel="noopener noreferrer"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
						sx={{ color: "text.disabled", flexShrink: 0 }}
					>
						<OpenInNewIcon fontSize="small" />
					</IconButton>
				</Tooltip>
				<Tooltip title={job.favorite ? "Unfavorite" : "Favorite"}>
					<IconButton
						size="small"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => {
							e.stopPropagation();
							onToggleFavorite(job);
						}}
						sx={{
							color: job.favorite ? "warning.main" : "text.disabled",
							flexShrink: 0,
						}}
					>
						{job.favorite ? (
							<StarIcon fontSize="small" />
						) : (
							<StarBorderIcon fontSize="small" />
						)}
					</IconButton>
				</Tooltip>
			</Box>

			{/* Card body — clickable to open edit dialog */}
			<CardActionArea
				onPointerDown={(e) => e.stopPropagation()}
				onClick={onClick}
				sx={{ p: 0 }}
			>
				<CardContent sx={{ pt: 1, pb: "10px !important", px: 1.5 }}>
					<Typography
						variant="body2"
						color="text.secondary"
						noWrap
						sx={{ mb: hasChips || job.recruiter ? 0.75 : 0 }}
					>
						{job.role}
					</Typography>

					{hasChips && (
						<Box
							sx={{
								display: "flex",
								flexWrap: "wrap",
								gap: 0.5,
								alignItems: "center",
								mb: job.recruiter ? 0.5 : 0,
							}}
						>
							{job.salary && (
								<Chip label={job.salary} size="small" variant="filled" />
							)}
							{job.referred_by && (
								<Chip
									icon={<PeopleIcon />}
									label={job.referred_by}
									size="small"
									variant="outlined"
									sx={{ maxWidth: 120 }}
								/>
							)}
						</Box>
					)}

					{job.recruiter && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block" }}
						>
							Recruiter: {job.recruiter}
						</Typography>
					)}

					{(() => {
						const { label, getDate } = STATUS_DATE_LABEL[job.status];
						const date = getDate(job);
						if (!date) return null;
						return (
							<Typography
								variant="caption"
								color="text.disabled"
								sx={{ display: "block", mt: 0.5 }}
							>
								{label} {date}
							</Typography>
						);
					})()}
				</CardContent>
			</CardActionArea>
		</Card>
	);
}
