import React, { useCallback, useEffect, useState } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BusinessIcon from "@mui/icons-material/Business";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import { api } from "../api";
import { QUESTION_MAX_LENGTHS } from "../constants";
import type {
	Interview,
	InterviewQuestion,
	InterviewQuestionFormData,
	QuestionType,
} from "../types";
import MarkdownField from "./MarkdownField";
import DifficultySelector from "./DifficultySelector";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
	behavioral: "Behavioral",
	technical: "Technical",
	system_design: "System Design",
	coding: "Coding",
	culture_fit: "Culture Fit",
};

const QUESTION_TYPE_CHIP_SX: Record<
	QuestionType,
	{ bgcolor: string; color: string }
> = {
	behavioral: { bgcolor: "#e8f5e9", color: "#2e7d32" },
	technical: { bgcolor: "#e3f2fd", color: "#1565c0" },
	system_design: { bgcolor: "#f3e5f5", color: "#7b1fa2" },
	coding: { bgcolor: "#fff8e1", color: "#f57f17" },
	culture_fit: { bgcolor: "#fce4ec", color: "#c62828" },
};

const INTERVIEW_STAGE_LABELS: Record<string, string> = {
	phone_screen: "Phone Screen",
	onsite: "Onsite",
};

const VIBE_LABELS: Record<string, string> = {
	casual: "Casual",
	intense: "Intense",
};

const VIBE_CHIP_SX: Record<string, object> = {
	casual: { bgcolor: "#e3f2fd", color: "#1565c0" },
	intense: { bgcolor: "#fff3e0", color: "#e65100" },
};

const EMPTY_QUESTION_FORM: InterviewQuestionFormData = {
	question_type: "behavioral",
	question_text: "",
	question_notes: null,
	difficulty: 3,
};

type QuestionMode =
	| "list"
	| "add"
	| { editId: number }
	| { confirmDeleteId: number };

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
	interview: Interview;
}

export default function QuestionSubView({ jobId, interview }: Props) {
	const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<QuestionMode>("list");
	const [form, setForm] =
		useState<InterviewQuestionFormData>(EMPTY_QUESTION_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await api.getQuestions(jobId, interview.id);
			setQuestions(data);
		} finally {
			setLoading(false);
		}
	}, [jobId, interview.id]);

	useEffect(() => {
		void load();
	}, [load]);

	function setField<K extends keyof InterviewQuestionFormData>(
		field: K,
		value: InterviewQuestionFormData[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
		if (formError) setFormError(null);
	}

	function handleAddClick() {
		setForm(EMPTY_QUESTION_FORM);
		setFormError(null);
		setMode("add");
	}

	function handleEditClick(q: InterviewQuestion) {
		setForm({
			question_type: q.question_type,
			question_text: q.question_text,
			question_notes: q.question_notes,
			difficulty: q.difficulty,
		});
		setFormError(null);
		setMode({ editId: q.id });
	}

	function handleCancel() {
		setMode("list");
		setFormError(null);
	}

	async function handleSave() {
		if (!form.question_text.trim()) {
			setFormError("Question text is required");
			return;
		}
		if (form.question_text.length > QUESTION_MAX_LENGTHS.question_text) {
			setFormError(
				`Question text must be ${QUESTION_MAX_LENGTHS.question_text.toLocaleString()} characters or fewer`,
			);
			return;
		}
		if (
			form.question_notes &&
			form.question_notes.length > QUESTION_MAX_LENGTHS.question_notes
		) {
			setFormError(
				`Notes must be ${QUESTION_MAX_LENGTHS.question_notes.toLocaleString()} characters or fewer`,
			);
			return;
		}
		setSaving(true);
		try {
			if (mode === "add") {
				await api.createQuestion(jobId, interview.id, form);
			} else if (typeof mode === "object" && "editId" in mode) {
				await api.updateQuestion(jobId, interview.id, mode.editId, form);
			}
			setMode("list");
			await load();
		} catch {
			setFormError("Failed to save. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteConfirm(questionId: number) {
		setSaving(true);
		try {
			await api.deleteQuestion(jobId, interview.id, questionId);
			setMode("list");
			await load();
		} finally {
			setSaving(false);
		}
	}

	const TypeIcon =
		interview.interview_stage === "phone_screen" ? PhoneIcon : BusinessIcon;
	const typeLabel = INTERVIEW_STAGE_LABELS[interview.interview_stage];

	const isFormMode =
		mode === "add" || (typeof mode === "object" && "editId" in mode);

	return (
		<Box>
			{/* Interview summary header */}
			<Box
				sx={{
					bgcolor: "action.hover",
					borderRadius: 1,
					px: 1.5,
					py: 1,
					mb: 1.5,
					display: "flex",
					alignItems: "center",
					gap: 1,
					flexWrap: "wrap",
				}}
			>
				<TypeIcon
					sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }}
				/>
				<Typography variant="body2" fontWeight={600}>
					{typeLabel}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					&middot; {formatDttm(interview.interview_dttm)}
				</Typography>
				{interview.interview_vibe && (
					<Chip
						label={VIBE_LABELS[interview.interview_vibe]}
						size="small"
						sx={VIBE_CHIP_SX[interview.interview_vibe]}
					/>
				)}
				{interview.interview_interviewers && (
					<Typography variant="caption" color="text.secondary">
						{interview.interview_interviewers}
					</Typography>
				)}
			</Box>

			{/* Add question button */}
			<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
				{!isFormMode && questions.length > 0 && (
					<Button
						size="small"
						startIcon={<AddIcon />}
						onClick={handleAddClick}
						variant="outlined"
					>
						Add Question
					</Button>
				)}
			</Box>

			{/* Loading */}
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress size={28} />
				</Box>
			) : (
				<>
					{/* Question list */}
					{questions.map((q) => {
						const isEditing =
							typeof mode === "object" &&
							"editId" in mode &&
							mode.editId === q.id;
						const isConfirmingDelete =
							typeof mode === "object" &&
							"confirmDeleteId" in mode &&
							mode.confirmDeleteId === q.id;

						if (isConfirmingDelete) {
							return (
								<Box
									key={q.id}
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
										Delete this question?
									</Typography>
									<Button size="small" onClick={handleCancel}>
										Cancel
									</Button>
									<Button
										size="small"
										color="error"
										variant="contained"
										disabled={saving}
										onClick={() => void handleDeleteConfirm(q.id)}
									>
										Delete
									</Button>
								</Box>
							);
						}

						if (isEditing) {
							return (
								<Box key={q.id} sx={{ mb: 1 }}>
									<QuestionForm
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
							<QuestionCard
								key={q.id}
								question={q}
								onEdit={() => handleEditClick(q)}
								onDelete={() => setMode({ confirmDeleteId: q.id })}
							/>
						);
					})}

					{/* Empty state */}
					{questions.length === 0 && !isFormMode && (
						<Typography
							variant="body2"
							color="text.disabled"
							sx={{ textAlign: "center", py: 3 }}
						>
							No questions recorded yet.{" "}
							<Box
								component="span"
								onClick={handleAddClick}
								sx={{
									color: "primary.main",
									cursor: "pointer",
									"&:hover": { textDecoration: "underline" },
								}}
							>
								Add one.
							</Box>
						</Typography>
					)}

					{/* Add form */}
					{mode === "add" && (
						<QuestionForm
							data={form}
							onChange={setField}
							onSave={() => void handleSave()}
							onCancel={handleCancel}
							saving={saving}
							error={formError}
						/>
					)}
				</>
			)}
		</Box>
	);
}

function QuestionCard({
	question,
	onEdit,
	onDelete,
}: {
	question: InterviewQuestion;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const chipSx = QUESTION_TYPE_CHIP_SX[question.question_type];
	const typeLabel = QUESTION_TYPE_LABELS[question.question_type];

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
			<Box
				sx={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 1,
					mb: 0.75,
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						flexWrap: "wrap",
					}}
				>
					<Chip label={typeLabel} size="small" sx={chipSx} />
					<DifficultySelector value={question.difficulty} readOnly />
				</Box>
				<Box sx={{ display: "flex", flexShrink: 0 }}>
					<Tooltip title="Edit question">
						<IconButton
							size="small"
							onClick={onEdit}
							aria-label="Edit question"
						>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Delete question">
						<IconButton
							size="small"
							onClick={onDelete}
							aria-label="Delete question"
						>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
			<Typography variant="body2">{question.question_text}</Typography>
			{question.question_notes && (
				<Box
					sx={{
						mt: 0.5,
						color: "text.secondary",
						fontSize: "0.75rem",
						lineHeight: 1.6,
						"& p": { mt: 0, mb: 0.5 },
						"& p:last-child": { mb: 0 },
						"& ul, & ol": { mt: 0, mb: 0.5, pl: 2 },
						"& li": { mb: 0 },
						"& strong": { fontWeight: 700 },
						"& em": { fontStyle: "italic" },
						"& code": {
							fontFamily: "monospace",
							fontSize: "0.85em",
							bgcolor: "action.hover",
							px: 0.5,
							borderRadius: 0.5,
						},
					}}
				>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{question.question_notes}
					</ReactMarkdown>
				</Box>
			)}
		</Box>
	);
}

interface FormProps {
	data: InterviewQuestionFormData;
	onChange: <K extends keyof InterviewQuestionFormData>(
		field: K,
		value: InterviewQuestionFormData[K],
	) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
	error: string | null;
}

function QuestionForm({
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
			<Box
				sx={{
					display: "flex",
					gap: 1.5,
					mb: 1.5,
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<TextField
					select
					label="Type"
					value={data.question_type}
					onChange={(e) =>
						onChange("question_type", e.target.value as QuestionType)
					}
					size="small"
					sx={{ minWidth: 160 }}
				>
					{(
						Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]
					).map(([value, label]) => (
						<MenuItem key={value} value={value}>
							{label}
						</MenuItem>
					))}
				</TextField>
				<DifficultySelector
					value={data.difficulty}
					onChange={(v) => onChange("difficulty", v)}
				/>
			</Box>
			<TextField
				label="Question"
				value={data.question_text}
				onChange={(e) => onChange("question_text", e.target.value)}
				size="small"
				fullWidth
				multiline
				minRows={2}
				placeholder="What was the question?"
				sx={{ mb: 1.5 }}
				slotProps={{
					htmlInput: { maxLength: QUESTION_MAX_LENGTHS.question_text },
				}}
			/>
			<Box sx={{ mb: 1.5 }}>
				<MarkdownField
					label="Notes"
					value={data.question_notes}
					onChange={(v) => onChange("question_notes", v)}
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
					Save Question
				</Button>
			</Box>
		</Box>
	);
}
