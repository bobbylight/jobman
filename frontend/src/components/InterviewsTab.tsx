import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	MenuItem,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BusinessIcon from "@mui/icons-material/Business";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import { api } from "../api";
import { INTERVIEW_MAX_LENGTHS } from "../constants";
import type {
	Interview,
	InterviewFeeling,
	InterviewFormData,
	InterviewResult,
	InterviewStage,
	InterviewType,
	InterviewVibe,
	JobStatus,
} from "../types";
import MarkdownField from "./MarkdownField";
import MarkdownSnippet from "./MarkdownSnippet";
import QuestionSubView from "./QuestionSubView";
import { formatTime } from "../jobUtils";

const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
	onsite: "Onsite",
	phone_screen: "Phone Screen",
};

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
	recruiter_call: "Recruiter Call",
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	leadership: "Leadership",
	past_experience: "Past Experience",
	system_design: "System Design",
};

const VIBE_OPTIONS: {
	value: InterviewVibe;
	emoji: string;
	label: string;
	selectedBg: string;
	selectedColor: string;
	chipBg: string;
	chipColor: string;
}[] = [
	{
		value: "casual",
		emoji: "☕",
		label: "Casual",
		selectedBg: "#e3f2fd",
		selectedColor: "#1565c0",
		chipBg: "#e3f2fd",
		chipColor: "#1565c0",
	},
	{
		value: "intense",
		emoji: "⚡",
		label: "Intense",
		selectedBg: "#fff3e0",
		selectedColor: "#e65100",
		chipBg: "#fff3e0",
		chipColor: "#e65100",
	},
];

const RESULT_CHIP_SX: Record<InterviewResult, object> = {
	passed: { bgcolor: "#e8f5e9", color: "#2e7d32" },
	failed: { bgcolor: "#ffebee", color: "#c62828" },
};

const RESULT_LABELS: Record<InterviewResult, string> = {
	passed: "✓ Passed",
	failed: "✗ Failed",
};

const FEELING_OPTIONS: {
	value: InterviewFeeling;
	emoji: string;
	label: string;
	selectedBg: string;
	selectedColor: string;
	chipBg: string;
	chipColor: string;
}[] = [
	{
		value: "aced",
		emoji: "🌟",
		label: "Aced",
		selectedBg: "#e8f5e9",
		selectedColor: "#1b5e20",
		chipBg: "#e8f5e9",
		chipColor: "#1b5e20",
	},
	{
		value: "pretty_good",
		emoji: "👍",
		label: "Pretty good",
		selectedBg: "#f1f8e9",
		selectedColor: "#33691e",
		chipBg: "#f1f8e9",
		chipColor: "#33691e",
	},
	{
		value: "meh",
		emoji: "😐",
		label: "Meh",
		selectedBg: "#fff8e1",
		selectedColor: "#f57f17",
		chipBg: "#fff8e1",
		chipColor: "#f57f17",
	},
	{
		value: "struggled",
		emoji: "😬",
		label: "Struggled",
		selectedBg: "#fff3e0",
		selectedColor: "#e65100",
		chipBg: "#fff3e0",
		chipColor: "#e65100",
	},
	{
		value: "flunked",
		emoji: "💀",
		label: "Flunked",
		selectedBg: "#ffebee",
		selectedColor: "#b71c1c",
		chipBg: "#ffebee",
		chipColor: "#b71c1c",
	},
];

function makeEmptyForm(jobStatus: JobStatus): InterviewFormData {
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

type Mode = "list" | "add" | { editId: number } | { confirmDeleteId: number };

interface Props {
	jobId: number;
	jobStatus: JobStatus;
	onCountChange: (count: number) => void;
	viewingQuestionsFor: Interview | null;
	onViewingQuestionsChange: (interview: Interview | null) => void;
}

export default function InterviewsTab({
	jobId,
	jobStatus,
	onCountChange,
	viewingQuestionsFor,
	onViewingQuestionsChange,
}: Props) {
	const [interviews, setInterviews] = useState<Interview[]>([]);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<Mode>("list");
	const [form, setForm] = useState<InterviewFormData>(() =>
		makeEmptyForm(jobStatus),
	);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [questionCounts, setQuestionCounts] = useState<Record<number, number>>(
		{},
	);
	// Tracks what's mounted in the questions panel; cleared after slide-back animation
	const [displayedInterview, setDisplayedInterview] =
		useState<Interview | null>(null);
	const prevViewingRef = useRef<Interview | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await api.getInterviews(jobId);
			const sorted = data.toSorted((a, b) =>
				b.interview_dttm.localeCompare(a.interview_dttm),
			);
			setInterviews(sorted);
			onCountChange(sorted.length);
			// Fetch question counts in parallel
			void Promise.all(
				sorted.map(async (iv) => {
					const qs = await api.getQuestions(jobId, iv.id);
					setQuestionCounts((prev) => ({ ...prev, [iv.id]: qs.length }));
				}),
			);
		} finally {
			setLoading(false);
		}
	}, [jobId, onCountChange]);

	const refreshQuestionCounts = useCallback(
		(ivList: Interview[]) => {
			void Promise.all(
				ivList.map(async (iv) => {
					const qs = await api.getQuestions(jobId, iv.id);
					setQuestionCounts((prev) => ({ ...prev, [iv.id]: qs.length }));
				}),
			);
		},
		[jobId],
	);

	useEffect(() => {
		void load();
	}, [load]);

	// Refresh question counts when returning from the question sub-view
	useEffect(() => {
		const wasViewing = prevViewingRef.current;
		prevViewingRef.current = viewingQuestionsFor;
		if (wasViewing !== null && viewingQuestionsFor === null) {
			refreshQuestionCounts(interviews);
		}
	}, [viewingQuestionsFor, interviews, refreshQuestionCounts]);

	// Keep the questions panel mounted during the slide-back animation, then unmount
	useEffect(() => {
		if (viewingQuestionsFor !== null) {
			setDisplayedInterview(viewingQuestionsFor);
		} else {
			const timer = setTimeout(() => setDisplayedInterview(null), 350);
			return () => clearTimeout(timer);
		}
	}, [viewingQuestionsFor]);

	function setField<K extends keyof InterviewFormData>(
		field: K,
		value: InterviewFormData[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
		if (formError) {
			setFormError(null);
		}
	}

	function handleAddClick() {
		setForm(makeEmptyForm(jobStatus));
		setFormError(null);
		setMode("add");
	}

	function handleEditClick(interview: Interview) {
		setForm({
			interview_dttm: interview.interview_dttm.slice(0, 16),
			interview_interviewers: interview.interview_interviewers,
			interview_notes: interview.interview_notes,
			interview_stage: interview.interview_stage,
			interview_type: interview.interview_type,
			interview_vibe: interview.interview_vibe,
			interview_result: interview.interview_result,
			interview_feeling: interview.interview_feeling,
		});
		setFormError(null);
		setMode({ editId: interview.id });
	}

	function handleCancel() {
		setMode("list");
		setFormError(null);
	}

	async function handleSave() {
		if (!form.interview_dttm) {
			setFormError("Date and time are required");
			return;
		}
		if (
			form.interview_interviewers &&
			form.interview_interviewers.length >
				INTERVIEW_MAX_LENGTHS.interview_interviewers
		) {
			setFormError(
				`Interviewers must be ${INTERVIEW_MAX_LENGTHS.interview_interviewers.toLocaleString()} characters or fewer`,
			);
			return;
		}
		if (
			form.interview_notes &&
			form.interview_notes.length > INTERVIEW_MAX_LENGTHS.interview_notes
		) {
			setFormError(
				`Notes must be ${INTERVIEW_MAX_LENGTHS.interview_notes.toLocaleString()} characters or fewer`,
			);
			return;
		}
		setSaving(true);
		try {
			if (mode === "add") {
				await api.createInterview(jobId, form);
			} else if (typeof mode === "object" && "editId" in mode) {
				await api.updateInterview(jobId, mode.editId, form);
			}
			setMode("list");
			await load();
		} catch {
			setFormError("Failed to save. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteConfirm(interviewId: number) {
		setSaving(true);
		try {
			await api.deleteInterview(jobId, interviewId);
			setMode("list");
			await load();
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	// ---- Date bucketing ----
	const now = new Date();
	const upcomingInterviews = interviews
		.filter((iv) => new Date(iv.interview_dttm) >= now)
		.toSorted((a, b) => a.interview_dttm.localeCompare(b.interview_dttm));
	// Interviews is already sorted descending from load()
	const priorInterviews = interviews.filter(
		(iv) => new Date(iv.interview_dttm) < now,
	);

	const isFormMode =
		mode === "add" || (typeof mode === "object" && "editId" in mode);

	const renderItem = (interview: Interview, questionsDisabled: boolean) => {
		const isEditing =
			typeof mode === "object" &&
			"editId" in mode &&
			mode.editId === interview.id;
		const isConfirmingDelete =
			typeof mode === "object" &&
			"confirmDeleteId" in mode &&
			mode.confirmDeleteId === interview.id;

		if (isConfirmingDelete) {
			return (
				<Box
					key={interview.id}
					sx={{
						alignItems: "center",
						border: "1px solid",
						borderColor: "error.light",
						borderRadius: 1,
						display: "flex",
						gap: 2,
						mb: 1,
						p: 1.5,
					}}
				>
					<Typography variant="body2" sx={{ flex: 1 }}>
						Delete this interview?
					</Typography>
					<Button size="small" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						size="small"
						color="error"
						variant="contained"
						disabled={saving}
						onClick={() => void handleDeleteConfirm(interview.id)}
					>
						Delete
					</Button>
				</Box>
			);
		}

		if (isEditing) {
			return (
				<Box key={interview.id} sx={{ mb: 1 }}>
					<InterviewForm
						data={form}
						onChange={setField}
						onSave={() => void handleSave()}
						onCancel={handleCancel}
						saving={saving}
						error={formError}
					/>
				</Box>
			);
		}

		return (
			<InterviewCard
				key={interview.id}
				interview={interview}
				questionCount={questionCounts[interview.id] ?? 0}
				questionsDisabled={questionsDisabled}
				onEdit={() => handleEditClick(interview)}
				onDelete={() => setMode({ confirmDeleteId: interview.id })}
				onViewQuestions={() => onViewingQuestionsChange(interview)}
			/>
		);
	};

	const renderWeekSection = (
		title: string,
		sectionInterviews: Interview[],
		questionsDisabled = false,
	) => {
		if (sectionInterviews.length === 0) {
			return null;
		}

		// Group by calendar day
		const dayMap = new Map<string, Interview[]>();
		for (const iv of sectionInterviews) {
			const key = new Date(iv.interview_dttm).toDateString();
			if (!dayMap.has(key)) {
				dayMap.set(key, []);
			}
			dayMap.get(key)!.push(iv);
		}

		return (
			<Box sx={{ mb: 2 }}>
				<Typography
					variant="overline"
					color="text.secondary"
					sx={{ display: "block", lineHeight: 2, mb: 0.75 }}
				>
					{title}
				</Typography>
				{[...dayMap.entries()].map(([dateStr, dayInterviews]) => {
					const d = new Date(dateStr);
					const isToday = d.toDateString() === new Date().toDateString();
					const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
					const dateLabel = d.toLocaleDateString("en-US", {
						day: "numeric",
						month: "short",
					});

					return (
						<Box
							key={dateStr}
							sx={{ alignItems: "stretch", display: "flex", mb: 1.5 }}
						>
							{/* Left rail: day label */}
							<Box
								sx={{
									flexShrink: 0,
									pr: 1.5,
									pt: 0.5,
									textAlign: "right",
									width: 48,
								}}
							>
								<Typography
									variant="caption"
									fontWeight={600}
									color={isToday ? "primary.main" : "text.secondary"}
									sx={{ display: "block", lineHeight: 1.3 }}
								>
									{weekday}
								</Typography>
								<Typography
									variant="caption"
									color={isToday ? "primary.main" : "text.disabled"}
									sx={{
										display: "block",
										fontSize: "0.65rem",
										lineHeight: 1.3,
									}}
								>
									{dateLabel}
								</Typography>
							</Box>
							{/* Vertical line */}
							<Box
								sx={{
									bgcolor: isToday ? "primary.light" : "divider",
									borderRadius: "2px",
									flexShrink: 0,
									mr: 1.5,
									width: "2px",
								}}
							/>
							{/* Cards */}
							<Box sx={{ flex: 1, minWidth: 0 }}>
								{dayInterviews.map((iv) => renderItem(iv, questionsDisabled))}
							</Box>
						</Box>
					);
				})}
			</Box>
		);
	};

	return (
		<Box sx={{ overflow: "hidden" }}>
			<Box
				sx={{
					display: "flex",
					transform: viewingQuestionsFor
						? "translateX(-50%)"
						: "translateX(0%)",
					transition: "transform 0.3s ease-in-out",
					width: "200%",
				}}
			>
				{/* Panel 1: Interview list */}
				<Box sx={{ minWidth: "50%", overflow: "hidden", width: "50%" }}>
					<Box
						sx={{
							alignItems: "center",
							display: "flex",
							justifyContent: "flex-end",
							mb: 1.5,
						}}
					>
						{!isFormMode && (
							<Button
								size="small"
								startIcon={<AddIcon />}
								onClick={handleAddClick}
								variant="outlined"
							>
								Add Interview
							</Button>
						)}
					</Box>

					{interviews.length === 0 && !isFormMode && (
						<Typography
							variant="body2"
							color="text.disabled"
							sx={{ py: 3, textAlign: "center" }}
						>
							No interviews yet. Click &ldquo;Add Interview&rdquo; to get
							started.
						</Typography>
					)}

					{mode === "add" && (
						<Box sx={{ mb: 2, ml: "62px" }}>
							<InterviewForm
								data={form}
								onChange={setField}
								onSave={() => void handleSave()}
								onCancel={handleCancel}
								saving={saving}
								error={formError}
							/>
						</Box>
					)}

					{renderWeekSection("Upcoming", upcomingInterviews, true)}
					{renderWeekSection("Prior", priorInterviews)}
				</Box>

				{/* Panel 2: Questions sub-view */}
				<Box sx={{ minWidth: "50%", width: "50%" }}>
					{displayedInterview && (
						<QuestionSubView jobId={jobId} interview={displayedInterview} />
					)}
				</Box>
			</Box>
		</Box>
	);
}

function InterviewCard({
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

function InterviewForm({
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
