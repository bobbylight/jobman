import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { api } from "../../../api";
import { INTERVIEW_MAX_LENGTHS } from "../../../constants";
import type { Interview, InterviewFormData, JobStatus } from "../../../types";
import QuestionSubView from "./QuestionSubView";
import DayTimeline from "../../shared/DayTimeline";
import InterviewCard from "./InterviewCard";
import InterviewForm, { makeEmptyForm } from "./InterviewForm";

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
				{[...dayMap.entries()].map(([dateStr, dayInterviews]) => (
					<DayTimeline key={dateStr} dateStr={dateStr}>
						{dayInterviews.map((iv) => renderItem(iv, questionsDisabled))}
					</DayTimeline>
				))}
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
