import React, { useState, useEffect, useRef } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Autocomplete,
	Alert,
	Button,
	Chip,
	CircularProgress,
	TextField,
	MenuItem,
	Grid,
	IconButton,
	Tooltip,
	Typography,
	Box,
	Link,
} from "@mui/material";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import InterviewsTab from "./InterviewsTab";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	JOB_MAX_LENGTHS,
	STATUSES,
	FIT_SCORES,
	ENDING_SUBSTATUSES,
	TERMINAL_STATUSES,
	JOB_TAGS,
	TAG_LABELS,
	tagChipProps,
} from "../constants";
import CompanyLogo from "./CompanyLogo";
import MarkdownField from "./MarkdownField";
import { api } from "../api";
import type {
	JobFormData,
	FitScore,
	JobStatus,
	JobTag,
	EndingSubstatus,
	Interview,
} from "../types";

const EMPTY: JobFormData = {
	date_applied: null,
	company: "",
	role: "",
	link: "",
	salary: null,
	fit_score: null,
	referred_by: null,
	status: "Not started",
	recruiter: null,
	notes: null,
	job_description: null,
	ending_substatus: null,
	date_phone_screen: null,
	date_last_onsite: null,
	updated_at: "",
	favorite: false,
	tags: [],
};

interface Props {
	open: boolean;
	onClose: () => void;
	onSave: (data: JobFormData) => void;
	onDelete: (id: number) => void;
	/** null = "add new job" mode; a number = edit the job with that ID */
	jobId: number | null;
}

export default function JobDialog({
	open,
	onClose,
	onSave,
	onDelete,
	jobId,
}: Props) {
	const isEdit = jobId !== null;
	const [form, setForm] = useState<JobFormData>(EMPTY);
	const [loadingJob, setLoadingJob] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [errors, setErrors] = useState<
		Partial<Record<keyof JobFormData, string>>
	>({});
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [linkEditing, setLinkEditing] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [interviewCount, setInterviewCount] = useState<number | null>(null);
	const [viewingQuestionsFor, setViewingQuestionsFor] =
		useState<Interview | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!open) return;

		// Reset all state on open
		setForm(EMPTY);
		setErrors({});
		setConfirmDelete(false);
		setLinkEditing(false);
		setActiveTab(0);
		setInterviewCount(null);
		setViewingQuestionsFor(null);
		setLoadError(null);

		if (jobId === null) {
			setLoadingJob(false);
			return;
		}

		// Fetch the job by ID
		const controller = new AbortController();
		abortRef.current = controller;
		setLoadingJob(true);

		api
			.getJob(jobId)
			.then((job) => {
				if (controller.signal.aborted) return;
				setForm({ ...EMPTY, ...job });
				setLoadingJob(false);
			})
			.catch(() => {
				if (controller.signal.aborted) return;
				setLoadError("Failed to load job. Please close and try again.");
				setLoadingJob(false);
			});

		return () => {
			controller.abort();
		};
	}, [open, jobId]);

	function handleClose() {
		abortRef.current?.abort();
		onClose();
	}

	function set<K extends keyof JobFormData>(field: K, value: JobFormData[K]) {
		setForm((f) => ({ ...f, [field]: value }));
		// exactOptionalPropertyTypes: can't assign undefined to an optional property —
		// delete the key instead to properly clear the error.
		if (errors[field]) setErrors(({ [field]: _, ...rest }) => rest);
	}

	function validate() {
		const e: typeof errors = {};
		if (!form.company?.trim()) e.company = "Required";
		else if (form.company.length > JOB_MAX_LENGTHS.company)
			e.company = `Must be ${JOB_MAX_LENGTHS.company.toLocaleString()} characters or fewer`;

		if (!form.role?.trim()) e.role = "Required";
		else if (form.role.length > JOB_MAX_LENGTHS.role)
			e.role = `Must be ${JOB_MAX_LENGTHS.role.toLocaleString()} characters or fewer`;

		if (!form.link?.trim()) e.link = "Required";
		else if (form.link.length > JOB_MAX_LENGTHS.link)
			e.link = `Must be ${JOB_MAX_LENGTHS.link.toLocaleString()} characters or fewer`;

		if (form.salary && form.salary.length > JOB_MAX_LENGTHS.salary)
			e.salary = `Must be ${JOB_MAX_LENGTHS.salary.toLocaleString()} characters or fewer`;
		if (form.recruiter && form.recruiter.length > JOB_MAX_LENGTHS.recruiter)
			e.recruiter = `Must be ${JOB_MAX_LENGTHS.recruiter.toLocaleString()} characters or fewer`;
		if (
			form.referred_by &&
			form.referred_by.length > JOB_MAX_LENGTHS.referred_by
		)
			e.referred_by = `Must be ${JOB_MAX_LENGTHS.referred_by.toLocaleString()} characters or fewer`;
		if (form.notes && form.notes.length > JOB_MAX_LENGTHS.notes)
			e.notes = `Must be ${JOB_MAX_LENGTHS.notes.toLocaleString()} characters or fewer`;
		if (
			form.job_description &&
			form.job_description.length > JOB_MAX_LENGTHS.job_description
		)
			e.job_description = `Must be ${JOB_MAX_LENGTHS.job_description.toLocaleString()} characters or fewer`;

		if (TERMINAL_STATUSES.has(form.status) && !form.ending_substatus)
			e.ending_substatus = "Required for this status";
		setErrors(e);
		return Object.keys(e).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		onSave(form);
	}

	// ── Confirm-delete dialog ──────────────────────────────────────────────────
	const confirmDialog = (
		<Dialog
			open={confirmDelete}
			onClose={() => setConfirmDelete(false)}
			maxWidth="xs"
		>
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<WarningAmberIcon color="warning" />
				Delete job?
			</DialogTitle>
			<DialogContent>
				<Typography>
					Are you sure you want to delete{" "}
					<strong>
						{form.company}
						{form.role ? ` – ${form.role}` : ""}
					</strong>
					? This cannot be undone.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
				<Button
					color="error"
					variant="contained"
					onClick={() => {
						setConfirmDelete(false);
						onDelete(jobId!);
					}}
				>
					Delete
				</Button>
			</DialogActions>
		</Dialog>
	);

	const formDisabled = loadingJob || !!loadError;

	// ── Main dialog ────────────────────────────────────────────────────────────
	return (
		<>
			<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					{isEdit ? (
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								minWidth: 0,
								flex: 1,
								mr: 1,
							}}
						>
							{form.company && <CompanyLogo company={form.company} size={24} />}
							<Typography
								component="span"
								noWrap
								sx={{
									fontSize: "inherit",
									fontWeight: "inherit",
									lineHeight: "inherit",
								}}
							>
								{form.company}
								{form.role ? ` - ${form.role}` : ""}
							</Typography>
						</Box>
					) : (
						"Add Job"
					)}
					<Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
						{!formDisabled && (
							<Tooltip title={form.favorite ? "Unfavorite" : "Favorite"}>
								<IconButton
									size="small"
									onClick={() => set("favorite", !form.favorite)}
									sx={{
										color: form.favorite ? "warning.main" : "text.disabled",
									}}
								>
									{form.favorite ? (
										<StarIcon fontSize="small" />
									) : (
										<StarBorderIcon fontSize="small" />
									)}
								</IconButton>
							</Tooltip>
						)}
						<IconButton onClick={handleClose} size="small">
							<CloseIcon />
						</IconButton>
					</Box>
				</DialogTitle>

				{isEdit && !loadingJob && !loadError && (
					<Tabs
						value={activeTab}
						onChange={(_: React.SyntheticEvent, v: number) => setActiveTab(v)}
						sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
					>
						<Tab label="Details" />
						<Tab
							label={
								interviewCount !== null
									? `Interviews (${interviewCount})`
									: "Interviews"
							}
						/>
					</Tabs>
				)}

				<DialogContent dividers>
					{loadingJob && (
						<Box
							sx={{ display: "flex", justifyContent: "center", py: 4 }}
							role="status"
							aria-label="Loading job"
						>
							<CircularProgress />
						</Box>
					)}
					{loadError && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{loadError}
						</Alert>
					)}
					<Box
						component="fieldset"
						disabled={formDisabled}
						sx={{ border: "none", p: 0, m: 0 }}
					>
						<Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
							<Grid container spacing={2} sx={{ pt: 0.5 }}>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Company *"
										value={form.company}
										onChange={(e) => set("company", e.target.value)}
										error={!!errors.company}
										helperText={errors.company}
										fullWidth
										size="small"
										slotProps={{
											htmlInput: { maxLength: JOB_MAX_LENGTHS.company },
										}}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Role *"
										value={form.role}
										onChange={(e) => set("role", e.target.value)}
										error={!!errors.role}
										helperText={errors.role}
										fullWidth
										size="small"
										slotProps={{
											htmlInput: { maxLength: JOB_MAX_LENGTHS.role },
										}}
									/>
								</Grid>
								<Grid size={12}>
									{isEdit && !linkEditing ? (
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											<Link
												href={form.link}
												target="_blank"
												rel="noopener noreferrer"
												sx={{ wordBreak: "break-all" }}
											>
												{form.link}
											</Link>
											<IconButton
												size="small"
												onClick={() => setLinkEditing(true)}
												aria-label="Edit link"
												title="Edit link"
											>
												<EditIcon fontSize="small" />
											</IconButton>
										</Box>
									) : (
										<TextField
											label="Link *"
											value={form.link}
											onChange={(e) => set("link", e.target.value)}
											error={!!errors.link}
											helperText={errors.link}
											fullWidth
											size="small"
											placeholder="https://..."
											slotProps={{
												htmlInput: { maxLength: JOB_MAX_LENGTHS.link },
											}}
										/>
									)}
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										select
										label="Status"
										value={form.status}
										onChange={(e) => {
											const newStatus = e.target.value as JobStatus;
											const isTerminal = TERMINAL_STATUSES.has(newStatus);
											setForm((f) => ({
												...f,
												status: newStatus,
												ending_substatus: isTerminal
													? f.ending_substatus
													: null,
											}));
											if (errors.status)
												setErrors(({ status: _, ...rest }) => rest);
											if (!isTerminal)
												setErrors(({ ending_substatus: _, ...rest }) => rest);
										}}
										fullWidth
										size="small"
									>
										{STATUSES.map((s) => (
											<MenuItem key={s} value={s}>
												{s}
											</MenuItem>
										))}
									</TextField>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										select
										label="Final Resolution"
										value={form.ending_substatus ?? ""}
										onChange={(e) =>
											set(
												"ending_substatus",
												(e.target.value || null) as EndingSubstatus | null,
											)
										}
										disabled={!TERMINAL_STATUSES.has(form.status)}
										error={!!errors.ending_substatus}
										helperText={errors.ending_substatus}
										fullWidth
										size="small"
									>
										<MenuItem value="">
											<em>None</em>
										</MenuItem>
										{ENDING_SUBSTATUSES.map((s) => (
											<MenuItem key={s} value={s}>
												{s}
											</MenuItem>
										))}
									</TextField>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										select
										label="Fit Score"
										value={form.fit_score ?? ""}
										onChange={(e) =>
											set(
												"fit_score",
												(e.target.value || null) as FitScore | null,
											)
										}
										fullWidth
										size="small"
									>
										<MenuItem value="">
											<em>None</em>
										</MenuItem>
										{FIT_SCORES.map((s) => (
											<MenuItem key={s} value={s}>
												{s}
											</MenuItem>
										))}
									</TextField>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Date Applied"
										type="date"
										value={form.date_applied ?? ""}
										onChange={(e) =>
											set("date_applied", e.target.value || null)
										}
										fullWidth
										size="small"
										slotProps={{ inputLabel: { shrink: true } }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Phone Screen Date"
										type="datetime-local"
										value={form.date_phone_screen?.slice(0, 16) ?? ""}
										onChange={(e) =>
											set("date_phone_screen", e.target.value || null)
										}
										fullWidth
										size="small"
										slotProps={{ inputLabel: { shrink: true } }}
									/>
								</Grid>
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Last Onsite Date"
										type="datetime-local"
										value={form.date_last_onsite?.slice(0, 16) ?? ""}
										onChange={(e) =>
											set("date_last_onsite", e.target.value || null)
										}
										fullWidth
										size="small"
										slotProps={{ inputLabel: { shrink: true } }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Salary"
										value={form.salary ?? ""}
										onChange={(e) => set("salary", e.target.value || null)}
										error={!!errors.salary}
										helperText={errors.salary}
										fullWidth
										size="small"
										placeholder="e.g. $120k–$150k"
										slotProps={{
											htmlInput: { maxLength: JOB_MAX_LENGTHS.salary },
										}}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Recruiter"
										value={form.recruiter ?? ""}
										onChange={(e) => set("recruiter", e.target.value || null)}
										error={!!errors.recruiter}
										helperText={errors.recruiter}
										fullWidth
										size="small"
										slotProps={{
											htmlInput: { maxLength: JOB_MAX_LENGTHS.recruiter },
										}}
									/>
								</Grid>

								<Grid size={12}>
									<Autocomplete
										multiple
										options={JOB_TAGS}
										getOptionLabel={(tag) => TAG_LABELS[tag as JobTag] ?? tag}
										value={form.tags as JobTag[]}
										onChange={(_, newValue) => set("tags", newValue)}
										renderTags={(value, getTagProps) =>
											value.map((tag, index) => (
												<Chip
													{...getTagProps({ index })}
													{...tagChipProps(tag as JobTag, true)}
													key={tag}
													label={TAG_LABELS[tag as JobTag] ?? tag}
													size="small"
												/>
											))
										}
										renderInput={(params) => (
											<TextField {...params} label="Tags" size="small" />
										)}
									/>
								</Grid>

								<Grid size={12}>
									<MarkdownField
										label="Job Description"
										value={form.job_description ?? null}
										onChange={(v) => set("job_description", v)}
										placeholder="Paste the job description here in case the posting gets removed..."
									/>
									{errors.job_description && (
										<Typography
											variant="caption"
											color="error"
											sx={{ display: "block", mt: 0.5, mx: "14px" }}
										>
											{errors.job_description}
										</Typography>
									)}
								</Grid>

								<Grid size={12}>
									<MarkdownField
										label="Notes"
										value={form.notes ?? null}
										onChange={(v) => set("notes", v)}
									/>
									{errors.notes && (
										<Typography
											variant="caption"
											color="error"
											sx={{ display: "block", mt: 0.5, mx: "14px" }}
										>
											{errors.notes}
										</Typography>
									)}
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Referred By"
										value={form.referred_by ?? ""}
										onChange={(e) => set("referred_by", e.target.value || null)}
										error={!!errors.referred_by}
										helperText={errors.referred_by}
										fullWidth
										size="small"
										placeholder="Name of referrer"
										slotProps={{
											htmlInput: { maxLength: JOB_MAX_LENGTHS.referred_by },
										}}
									/>
								</Grid>
							</Grid>
						</Box>
						{isEdit && activeTab === 1 && (
							<InterviewsTab
								jobId={jobId!}
								onCountChange={setInterviewCount}
								viewingQuestionsFor={viewingQuestionsFor}
								onViewingQuestionsChange={setViewingQuestionsFor}
							/>
						)}
					</Box>
				</DialogContent>

				<DialogActions
					sx={{
						px: 3,
						py: 2,
						justifyContent:
							activeTab === 1
								? viewingQuestionsFor
									? "space-between"
									: "flex-end"
								: isEdit
									? "space-between"
									: "flex-end",
					}}
				>
					{activeTab === 0 && (
						<>
							{isEdit && (
								<Button
									color="error"
									onClick={() => setConfirmDelete(true)}
									disabled={formDisabled}
								>
									Delete
								</Button>
							)}
							<div>
								<Button onClick={handleClose} sx={{ mr: 1 }}>
									Cancel
								</Button>
								<Button
									variant="contained"
									onClick={handleSave}
									disabled={formDisabled}
								>
									{isEdit ? "Save" : "Add Job"}
								</Button>
							</div>
						</>
					)}
					{activeTab === 1 && (
						<>
							{viewingQuestionsFor && (
								<Button
									startIcon={<ArrowBackIcon />}
									onClick={() => setViewingQuestionsFor(null)}
								>
									Back to interviews
								</Button>
							)}
							<Button onClick={handleClose}>Close</Button>
						</>
					)}
				</DialogActions>
			</Dialog>

			{confirmDialog}
		</>
	);
}
