import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	MenuItem,
	Grid,
	FormControlLabel,
	Checkbox,
	IconButton,
	Typography,
	Box,
	Link,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	STATUSES,
	FIT_SCORES,
	ENDING_SUBSTATUSES,
	TERMINAL_STATUSES,
} from "../constants";
import type {
	Job,
	JobFormData,
	FitScore,
	JobStatus,
	EndingSubstatus,
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
	favorite: false,
};

interface Props {
	open: boolean;
	onClose: () => void;
	onSave: (data: JobFormData) => void;
	onDelete: (id: number) => void;
	initialValues: Job | null;
}

export default function JobDialog({
	open,
	onClose,
	onSave,
	onDelete,
	initialValues,
}: Props) {
	const isEdit = !!initialValues;
	const [form, setForm] = useState<JobFormData>(EMPTY);
	const [errors, setErrors] = useState<
		Partial<Record<keyof JobFormData, string>>
	>({});
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [linkEditing, setLinkEditing] = useState(false);

	useEffect(() => {
		if (open) {
			setForm(initialValues ? { ...EMPTY, ...initialValues } : EMPTY);
			setErrors({});
			setConfirmDelete(false);
			setLinkEditing(false);
		}
	}, [open, initialValues]);

	function set<K extends keyof JobFormData>(field: K, value: JobFormData[K]) {
		setForm((f) => ({ ...f, [field]: value }));
		// exactOptionalPropertyTypes: can't assign undefined to an optional property —
		// delete the key instead to properly clear the error.
		if (errors[field]) setErrors(({ [field]: _, ...rest }) => rest);
	}

	function validate() {
		const e: typeof errors = {};
		if (!form.company?.trim()) e.company = "Required";
		if (!form.role?.trim()) e.role = "Required";
		if (!form.link?.trim()) e.link = "Required";
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
						onDelete(initialValues!.id);
					}}
				>
					Delete
				</Button>
			</DialogActions>
		</Dialog>
	);

	// ── Main dialog ────────────────────────────────────────────────────────────
	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					{isEdit ? "Edit Job" : "Add Job"}
					<IconButton onClick={onClose} size="small">
						<CloseIcon />
					</IconButton>
				</DialogTitle>

				<DialogContent dividers>
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
										ending_substatus: isTerminal ? f.ending_substatus : null,
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
									set("fit_score", (e.target.value || null) as FitScore | null)
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
								onChange={(e) => set("date_applied", e.target.value || null)}
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
								fullWidth
								size="small"
								placeholder="e.g. $120k–$150k"
							/>
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								label="Recruiter"
								value={form.recruiter ?? ""}
								onChange={(e) => set("recruiter", e.target.value || null)}
								fullWidth
								size="small"
							/>
						</Grid>

						<Grid size={12}>
							<TextField
								label="Job Description"
								value={form.job_description ?? ""}
								onChange={(e) => set("job_description", e.target.value || null)}
								fullWidth
								size="small"
								multiline
								rows={5}
								placeholder="Paste the job description here in case the posting gets removed..."
							/>
						</Grid>

						<Grid size={12}>
							<TextField
								label="Notes"
								value={form.notes ?? ""}
								onChange={(e) => set("notes", e.target.value || null)}
								fullWidth
								size="small"
								multiline
								rows={3}
							/>
						</Grid>

						<Grid size={{ xs: 12, sm: 6 }}>
							<TextField
								label="Referred By"
								value={form.referred_by ?? ""}
								onChange={(e) => set("referred_by", e.target.value || null)}
								fullWidth
								size="small"
								placeholder="Name of referrer"
							/>
						</Grid>
						<Grid size={{ xs: 12, sm: 6 }}>
							<FormControlLabel
								control={
									<Checkbox
										checked={!!form.favorite}
										onChange={(e) => set("favorite", e.target.checked)}
									/>
								}
								label="Favorite"
							/>
						</Grid>
					</Grid>
				</DialogContent>

				<DialogActions
					sx={{
						px: 3,
						py: 2,
						justifyContent: isEdit ? "space-between" : "flex-end",
					}}
				>
					{isEdit && (
						<Button color="error" onClick={() => setConfirmDelete(true)}>
							Delete
						</Button>
					)}
					<div>
						<Button onClick={onClose} sx={{ mr: 1 }}>
							Cancel
						</Button>
						<Button variant="contained" onClick={handleSave}>
							{isEdit ? "Save" : "Add Job"}
						</Button>
					</div>
				</DialogActions>
			</Dialog>

			{confirmDialog}
		</>
	);
}
