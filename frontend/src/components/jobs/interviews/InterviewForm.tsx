import React from "react";
import {
	Box,
	Button,
	MenuItem,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	INTERVIEW_MAX_LENGTHS,
	INTERVIEW_STAGE_LABELS,
	INTERVIEW_TYPE_LABELS,
} from "../../constants";
import type {
	InterviewFeeling,
	InterviewFormData,
	InterviewResult,
	InterviewStage,
	InterviewType,
	InterviewVibe,
	JobStatus,
} from "../../types";
import MarkdownField from "../MarkdownField";
import { FEELING_OPTIONS, VIBE_OPTIONS } from "./interviewDisplayOptions";

export function makeEmptyForm(jobStatus: JobStatus): InterviewFormData {
	const isEarly = jobStatus === "Not started" || jobStatus === "Applied";
	return {
		interview_dttm: "",
		interview_interviewers: null,
		interview_notes: null,
		interview_stage: isEarly ? "phone_screen" : "onsite",
		interview_type: isEarly ? "recruiter_call" : null,
		interview_vibe: null,
		interview_result: null,
		interview_feeling: null,
	};
}

interface FormProps {
	data: InterviewFormData;
	onChange: <K extends keyof InterviewFormData>(
		field: K,
		value: InterviewFormData[K],
	) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
	error: string | null;
}

export default function InterviewForm({
	data,
	onChange,
	onSave,
	onCancel,
	saving,
	error,
}: FormProps) {
	const isPast =
		Boolean(data.interview_dttm) && new Date(data.interview_dttm) < new Date();

	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "primary.light",
				borderRadius: 1,
				mb: 1,
				p: 1.5,
			}}
		>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
				<TextField
					select
					label="Stage"
					value={data.interview_stage}
					onChange={(e) =>
						onChange("interview_stage", e.target.value as InterviewStage)
					}
					size="small"
					sx={{ minWidth: 140 }}
				>
					{(
						Object.entries(INTERVIEW_STAGE_LABELS) as [InterviewStage, string][]
					).map(([value, label]) => (
						<MenuItem key={value} value={value}>
							{label}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Date & Time"
					type="datetime-local"
					value={data.interview_dttm}
					onChange={(e) => onChange("interview_dttm", e.target.value)}
					size="small"
					required
					slotProps={{ inputLabel: { shrink: true } }}
					sx={{ minWidth: 220 }}
				/>
			</Box>
			<TextField
				label="Interviewers"
				value={data.interview_interviewers ?? ""}
				onChange={(e) =>
					onChange("interview_interviewers", e.target.value || null)
				}
				size="small"
				fullWidth
				placeholder="e.g. Jane Smith, Bob Lee"
				sx={{ mb: 1.5 }}
				slotProps={{
					htmlInput: {
						maxLength: INTERVIEW_MAX_LENGTHS.interview_interviewers,
					},
				}}
			/>
			<Box sx={{ mb: 1.5 }}>
				<TextField
					select
					label="Type"
					value={data.interview_type ?? ""}
					onChange={(e) =>
						onChange(
							"interview_type",
							(e.target.value || null) as InterviewType | null,
						)
					}
					size="small"
					sx={{ minWidth: 160 }}
				>
					<MenuItem value="">
						<em>None</em>
					</MenuItem>
					{(
						Object.entries(INTERVIEW_TYPE_LABELS) as [InterviewType, string][]
					).map(([value, label]) => (
						<MenuItem key={value} value={value}>
							{label}
						</MenuItem>
					))}
				</TextField>
			</Box>
			<Box sx={{ mb: 1.5 }}>
				<MarkdownField
					label="Notes"
					value={data.interview_notes}
					onChange={(v) => onChange("interview_notes", v)}
				/>
			</Box>
			<Box sx={{ mb: 1.5 }}>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ display: "block", fontWeight: 600, mb: 0.75 }}
				>
					After the interview
				</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexDirection: "column",
							gap: 0.5,
						}}
					>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={data.interview_vibe}
							disabled={!isPast}
							onChange={(_, v) =>
								onChange("interview_vibe", v as InterviewVibe | null)
							}
						>
							{VIBE_OPTIONS.map((opt) => (
								<Tooltip key={opt.value} title={opt.label}>
									<ToggleButton
										value={opt.value}
										aria-label={opt.label}
										sx={{
											fontSize: "1.3rem",
											lineHeight: 1,
											px: 1.25,
											py: 0.75,
											"&.Mui-selected": {
												bgcolor: opt.selectedBg,
												color: opt.selectedColor,
												"&:hover": {
													bgcolor: opt.selectedBg,
													filter: "brightness(0.95)",
												},
											},
										}}
									>
										{opt.emoji}
									</ToggleButton>
								</Tooltip>
							))}
						</ToggleButtonGroup>
						<Typography variant="caption" color="text.secondary">
							Vibe
						</Typography>
					</Box>
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexDirection: "column",
							gap: 0.5,
						}}
					>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={data.interview_feeling}
							disabled={!isPast}
							onChange={(_, v) =>
								onChange("interview_feeling", v as InterviewFeeling | null)
							}
						>
							{FEELING_OPTIONS.map((opt) => (
								<Tooltip key={opt.value} title={opt.label}>
									<ToggleButton
										value={opt.value}
										aria-label={opt.label}
										sx={{
											fontSize: "1.3rem",
											lineHeight: 1,
											px: 1.25,
											py: 0.75,
											"&.Mui-selected": {
												bgcolor: opt.selectedBg,
												color: opt.selectedColor,
												"&:hover": {
													bgcolor: opt.selectedBg,
													filter: "brightness(0.95)",
												},
											},
										}}
									>
										{opt.emoji}
									</ToggleButton>
								</Tooltip>
							))}
						</ToggleButtonGroup>
						<Typography variant="caption" color="text.secondary">
							Feeling
						</Typography>
					</Box>
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							flexDirection: "column",
							gap: 0.5,
						}}
					>
						<ToggleButtonGroup
							exclusive
							size="small"
							value={data.interview_result}
							disabled={!isPast}
							onChange={(_, v) =>
								onChange("interview_result", v as InterviewResult | null)
							}
						>
							<Tooltip title="Passed">
								<ToggleButton
									value="passed"
									aria-label="Passed"
									sx={{
										fontSize: "1.3rem",
										lineHeight: 1,
										px: 1.25,
										py: 0.75,
										"&.Mui-selected": {
											bgcolor: "#e8f5e9",
											color: "#2e7d32",
											"&:hover": { bgcolor: "#c8e6c9" },
										},
									}}
								>
									✅
								</ToggleButton>
							</Tooltip>
							<Tooltip title="Failed">
								<ToggleButton
									value="failed"
									aria-label="Failed"
									sx={{
										fontSize: "1.3rem",
										lineHeight: 1,
										px: 1.25,
										py: 0.75,
										"&.Mui-selected": {
											bgcolor: "#ffebee",
											color: "#c62828",
											"&:hover": { bgcolor: "#ffcdd2" },
										},
									}}
								>
									❌
								</ToggleButton>
							</Tooltip>
						</ToggleButtonGroup>
						<Typography variant="caption" color="text.secondary">
							Result
						</Typography>
					</Box>
				</Box>
				{!isPast && data.interview_dttm && (
					<Typography
						variant="caption"
						color="text.disabled"
						sx={{ display: "block", mt: 0.5 }}
					>
						Available once the interview date has passed
					</Typography>
				)}
			</Box>
			{error && (
				<Typography
					variant="caption"
					color="error"
					sx={{ display: "block", mb: 1 }}
				>
					{error}
				</Typography>
			)}
			<Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
				<Button size="small" onClick={onCancel} disabled={saving}>
					Cancel
				</Button>
				<Button
					size="small"
					variant="contained"
					onClick={onSave}
					disabled={saving}
				>
					Save Interview
				</Button>
			</Box>
		</Box>
	);
}
