import React from "react";
import {
	Box,
	Button,
	Chip,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import { INTERVIEW_STAGE_LABELS, INTERVIEW_TYPE_LABELS } from "../../constants";
import type { Interview, InterviewResult } from "../../types";
import MarkdownSnippet from "../MarkdownSnippet";
import { formatTime } from "../../jobUtils";
import { FEELING_OPTIONS, VIBE_OPTIONS } from "./interviewDisplayOptions";

const RESULT_CHIP_SX: Record<InterviewResult, object> = {
	passed: { bgcolor: "#e8f5e9", color: "#2e7d32" },
	failed: { bgcolor: "#ffebee", color: "#c62828" },
};

const RESULT_LABELS: Record<InterviewResult, string> = {
	passed: "✓ Passed",
	failed: "✗ Failed",
};

export default function InterviewCard({
	interview,
	questionCount,
	questionsDisabled,
	onEdit,
	onDelete,
	onViewQuestions,
}: {
	interview: Interview;
	questionCount: number;
	questionsDisabled: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onViewQuestions: () => void;
}) {
	const TypeIcon =
		interview.interview_stage === "phone_screen" ? PhoneIcon : BusinessIcon;
	const typeLabel = INTERVIEW_STAGE_LABELS[interview.interview_stage];
	const isPast = new Date(interview.interview_dttm) < new Date();
	const feelingOption = interview.interview_feeling
		? FEELING_OPTIONS.find((o) => o.value === interview.interview_feeling)
		: null;

	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 1,
				mb: 1,
				overflow: "hidden",
				p: 1.5,
			}}
		>
			<Box sx={{ alignItems: "flex-start", display: "flex", gap: 1 }}>
				<TypeIcon
					sx={{
						color: "text.secondary",
						flexShrink: 0,
						fontSize: 16,
						mt: 0.25,
					}}
				/>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexWrap: "wrap",
							gap: 1,
						}}
					>
						<Typography variant="body2" fontWeight={600}>
							{typeLabel}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							&middot; {formatTime(interview.interview_dttm)}
						</Typography>
						{interview.interview_type && (
							<Chip
								label={INTERVIEW_TYPE_LABELS[interview.interview_type]}
								size="small"
								sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a" }}
							/>
						)}
						{interview.interview_vibe &&
							(() => {
								const opt = VIBE_OPTIONS.find(
									(o) => o.value === interview.interview_vibe,
								)!;
								return (
									<Chip
										label={`${opt.emoji} ${opt.label}`}
										size="small"
										sx={{ bgcolor: opt.chipBg, color: opt.chipColor }}
									/>
								);
							})()}
						{isPast && interview.interview_result && (
							<Chip
								label={RESULT_LABELS[interview.interview_result]}
								size="small"
								sx={RESULT_CHIP_SX[interview.interview_result]}
							/>
						)}
						{isPast && feelingOption && (
							<Chip
								label={`${feelingOption.emoji} ${feelingOption.label}`}
								size="small"
								sx={{
									bgcolor: feelingOption.chipBg,
									color: feelingOption.chipColor,
								}}
							/>
						)}
					</Box>
					{interview.interview_interviewers && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block" }}
						>
							{interview.interview_interviewers}
						</Typography>
					)}
					{interview.interview_notes && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{
								display: "block",
								mt: 0.25,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							<MarkdownSnippet text={interview.interview_notes} />
						</Typography>
					)}
					<Button
						size="small"
						startIcon={<QuizOutlinedIcon sx={{ fontSize: 14 }} />}
						onClick={onViewQuestions}
						disabled={questionsDisabled}
						sx={{ minWidth: 0, mt: 0.5, p: 0, textTransform: "none" }}
					>
						{questionCount > 0 ? `Questions (${questionCount})` : "Questions"}
					</Button>
				</Box>
				<Box sx={{ display: "flex", flexShrink: 0 }}>
					<Tooltip title="Edit interview">
						<IconButton
							size="small"
							onClick={onEdit}
							aria-label="Edit interview"
						>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete interview">
						<IconButton
							size="small"
							onClick={onDelete}
							aria-label="Delete interview"
						>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
		</Box>
	);
}
