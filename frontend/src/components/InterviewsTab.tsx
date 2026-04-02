import React, { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	MenuItem,
	TextField,
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
import type {
	Interview,
	InterviewFormData,
	InterviewType,
	InterviewVibe,
} from "../types";
import MarkdownField from "./MarkdownField";
import QuestionSubView from "./QuestionSubView";

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
	phone_screen: "Phone Screen",
	onsite: "Onsite",
};

const INTERVIEW_VIBE_LABELS: Record<InterviewVibe, string> = {
	casual: "Casual",
	intense: "Intense",
};

const VIBE_CHIP_SX: Record<InterviewVibe, object> = {
	casual: { bgcolor: "#e3f2fd", color: "#1565c0" },
	intense: { bgcolor: "#fff3e0", color: "#e65100" },
};

const EMPTY_FORM: InterviewFormData = {
	interview_type: "phone_screen",
	interview_dttm: "",
	interview_interviewers: null,
	interview_vibe: null,
	interview_notes: null,
};

type Mode = "list" | "add" | { editId: number } | { confirmDeleteId: number };

function formatDttm(dttm: string): string {
	const d = new Date(dttm);
	if (isNaN(d.getTime())) return dttm;
	return d.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

interface Props {
	jobId: number;
	onCountChange: (count: number) => void;
}

export default function InterviewsTab({ jobId, onCountChange }: Props) {
	const [interviews, setInterviews] = useState<Interview[]>([]);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<Mode>("list");
	const [form, setForm] = useState<InterviewFormData>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [viewingQuestionsFor, setViewingQuestionsFor] =
		useState<Interview | null>(null);
	const [questionCounts, setQuestionCounts] = useState<Record<number, number>>(
		{},
	);

	useEffect(() => {
		void load();
	}, [jobId]);

	async function load() {
		setLoading(true);
		try {
			const data = await api.getInterviews(jobId);
			const sorted = [...data].sort((a, b) =>
				a.interview_dttm.localeCompare(b.interview_dttm),
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
	}

	function refreshQuestionCounts(ivList: Interview[]) {
		void Promise.all(
			ivList.map(async (iv) => {
				const qs = await api.getQuestions(jobId, iv.id);
				setQuestionCounts((prev) => ({ ...prev, [iv.id]: qs.length }));
			}),
		);
	}

	function setField<K extends keyof InterviewFormData>(
		field: K,
		value: InterviewFormData[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
		if (formError) setFormError(null);
	}

	function handleAddClick() {
		setForm(EMPTY_FORM);
		setFormError(null);
		setMode("add");
	}

	function handleEditClick(interview: Interview) {
		setForm({
			interview_type: interview.interview_type,
			interview_dttm: interview.interview_dttm.slice(0, 16),
			interview_interviewers: interview.interview_interviewers,
			interview_vibe: interview.interview_vibe,
			interview_notes: interview.interview_notes,
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

	if (viewingQuestionsFor) {
		return (
			<QuestionSubView
				jobId={jobId}
				interview={viewingQuestionsFor}
				onBack={() => {
					setViewingQuestionsFor(null);
					refreshQuestionCounts(interviews);
				}}
			/>
		);
	}

	const isFormMode =
		mode === "add" || (typeof mode === "object" && "editId" in mode);

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					justifyContent: "flex-end",
					alignItems: "center",
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

			{interviews.map((interview) => {
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
								border: "1px solid",
								borderColor: "error.light",
								borderRadius: 1,
								p: 1.5,
								mb: 1,
								display: "flex",
								alignItems: "center",
								gap: 2,
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
						onEdit={() => handleEditClick(interview)}
						onDelete={() => setMode({ confirmDeleteId: interview.id })}
						onViewQuestions={() => setViewingQuestionsFor(interview)}
					/>
				);
			})}

			{interviews.length === 0 && !isFormMode && (
				<Typography
					variant="body2"
					color="text.disabled"
					sx={{ textAlign: "center", py: 3 }}
				>
					No interviews yet. Click &ldquo;Add Interview&rdquo; to get started.
				</Typography>
			)}

			{mode === "add" && (
				<InterviewForm
					data={form}
					onChange={setField}
					onSave={() => void handleSave()}
					onCancel={handleCancel}
					saving={saving}
					error={formError}
				/>
			)}
		</Box>
	);
}

function InterviewCard({
	interview,
	questionCount,
	onEdit,
	onDelete,
	onViewQuestions,
}: {
	interview: Interview;
	questionCount: number;
	onEdit: () => void;
	onDelete: () => void;
	onViewQuestions: () => void;
}) {
	const TypeIcon =
		interview.interview_type === "phone_screen" ? PhoneIcon : BusinessIcon;
	const typeLabel = INTERVIEW_TYPE_LABELS[interview.interview_type];

	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 1,
				p: 1.5,
				mb: 1,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
				<TypeIcon
					sx={{
						fontSize: 16,
						color: "text.secondary",
						mt: 0.25,
						flexShrink: 0,
					}}
				/>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1,
							flexWrap: "wrap",
						}}
					>
						<Typography variant="body2" fontWeight={600}>
							{typeLabel}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							&middot; {formatDttm(interview.interview_dttm)}
						</Typography>
						{interview.interview_vibe && (
							<Chip
								label={INTERVIEW_VIBE_LABELS[interview.interview_vibe]}
								size="small"
								sx={VIBE_CHIP_SX[interview.interview_vibe]}
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
							{interview.interview_notes.split("\n")[0]}
						</Typography>
					)}
					<Button
						size="small"
						startIcon={<QuizOutlinedIcon sx={{ fontSize: 14 }} />}
						onClick={onViewQuestions}
						sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: "none" }}
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
	return (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "primary.light",
				borderRadius: 1,
				p: 1.5,
				mb: 1,
			}}
		>
			<Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
				<TextField
					select
					label="Type"
					value={data.interview_type}
					onChange={(e) =>
						onChange("interview_type", e.target.value as InterviewType)
					}
					size="small"
					sx={{ minWidth: 140 }}
				>
					{(
						Object.entries(INTERVIEW_TYPE_LABELS) as [InterviewType, string][]
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
			/>
			<TextField
				select
				label="Vibe"
				value={data.interview_vibe ?? ""}
				onChange={(e) =>
					onChange(
						"interview_vibe",
						(e.target.value || null) as InterviewVibe | null,
					)
				}
				size="small"
				sx={{ minWidth: 140, mb: 1.5 }}
			>
				<MenuItem value="">
					<em>None</em>
				</MenuItem>
				{(
					Object.entries(INTERVIEW_VIBE_LABELS) as [InterviewVibe, string][]
				).map(([value, label]) => (
					<MenuItem key={value} value={value}>
						{label}
					</MenuItem>
				))}
			</TextField>
			<Box sx={{ mb: 1.5 }}>
				<MarkdownField
					label="Notes"
					value={data.interview_notes}
					onChange={(v) => onChange("interview_notes", v)}
				/>
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
			<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
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
