import React, {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Alert,
	Badge,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	FormControlLabel,
	IconButton,
	InputAdornment,
	MenuItem,
	Popover,
	Select,
	Snackbar,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import TuneIcon from "@mui/icons-material/Tune";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type {
	EndingSubstatus,
	FitScore,
	Job,
	JobFormData,
	JobStatus,
	JobTag,
} from "../types";
import {
	FIT_SCORES,
	JOB_TAGS,
	TAG_LABELS,
	TERMINAL_STATUSES,
	tagChipProps,
} from "../constants";
import KanbanBoard from "./KanbanBoard";
import JobDialog from "./JobDialog";
import EndingStatusDialog from "./EndingStatusDialog";

type Severity = "success" | "error" | "info" | "warning";

/** Strip heavy fields not needed by the Kanban board to keep state lean. */
function toSummaryJob(job: Job): Job {
	const { notes: _n, job_description: _jd, ...rest } = job;
	return rest;
}

// Minimum fit score filter: show jobs at or above this threshold
// "Not sure" is excluded when any threshold is set
const MIN_FIT_SCORE_OPTIONS: { label: string; value: FitScore | null }[] = [
	{ label: "Any score", value: null },
	{ label: "Low or better", value: "Low" },
	{ label: "Medium or better", value: "Medium" },
	{ label: "High or better", value: "High" },
	{ label: "Very High only", value: "Very High" },
];

export default function JobManagementPage() {
	const navigate = useNavigate();
	const { jobId } = useParams<{ jobId?: string }>();

	const [jobs, setJobs] = useState<Job[]>([]);
	const [search, setSearch] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [minFitScore, setMinFitScore] = useState<FitScore | null>(null);
	const [hideWithdrawn, setHideWithdrawn] = useState(true);
	const [filterTags, setFilterTags] = useState<JobTag[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

	// "add" dialog is purely local; "edit" dialog is driven by the URL
	const [addOpen, setAddOpen] = useState(false);
	const [editJob, setEditJob] = useState<Job | null>(null);

	const [pendingTerminalChange, setPendingTerminalChange] = useState<{
		job: Job;
		newStatus: JobStatus;
	} | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	const [snack, setSnack] = useState<{
		open: boolean;
		message: string;
		severity: Severity;
	}>({
		message: "",
		open: false,
		severity: "success",
	});

	const notify = (message: string, severity: Severity = "success") =>
		setSnack({ message, open: true, severity });

	const loadJobs = useCallback(async () => {
		try {
			const data = await api.getJobs();
			setJobs(data);
		} catch {
			notify("Failed to load jobs", "error");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadJobs();
	}, [loadJobs]);

	// Sync the edit dialog with the URL param once jobs are loaded
	useEffect(() => {
		if (!jobId) {
			setEditJob(null);
			return;
		}
		if (loading) {
			return;
		}
		const id = parseInt(jobId, 10);
		const found = jobs.find((j) => j.id === id) ?? null;
		if (!found) {
			navigate("/jobs", { replace: true });
			return;
		}
		setEditJob(found);
	}, [jobId, jobs, loading, navigate]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "/") {
				return;
			}
			const tag = (e.target as HTMLElement).tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(e.target as HTMLElement).isContentEditable
			) {
				return;
			}
			e.preventDefault();
			searchRef.current?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const openAdd = useCallback(() => setAddOpen(true), []);
	const openEdit = useCallback(
		(job: Job) => navigate(`/jobs/${job.id}`),
		[navigate],
	);
	const closeDialog = useCallback(() => {
		if (addOpen) {
			setAddOpen(false);
		} else {
			navigate("/jobs");
		}
	}, [addOpen, navigate]);

	// The job being edited (null when in "add" mode)
	const dialogJob = addOpen ? null : editJob;
	const dialogOpen = addOpen || editJob !== null;

	const handleSave = useCallback(
		async (formData: JobFormData) => {
			try {
				if (dialogJob) {
					const updated = await api.updateJob(dialogJob.id, formData);
					setJobs((prev) =>
						prev.map((j) => (j.id === updated.id ? toSummaryJob(updated) : j)),
					);
					notify("Job updated");
				} else {
					const created = await api.createJob(formData);
					setJobs((prev) => [toSummaryJob(created), ...prev]);
					notify("Job added");
				}
				closeDialog();
			} catch {
				notify("Failed to save job", "error");
			}
		},
		[dialogJob, closeDialog],
	);

	const handleDelete = useCallback(
		async (id: number) => {
			try {
				await api.deleteJob(id);
				setJobs((prev) => prev.filter((j) => j.id !== id));
				closeDialog();
				notify("Job deleted");
			} catch {
				notify("Failed to delete job", "error");
			}
		},
		[closeDialog],
	);

	const applyStatusChange = useCallback(
		async (job: Job, newStatus: JobStatus, extraUpdates?: Partial<Job>) => {
			const optimistic = { ...job, status: newStatus, ...extraUpdates };
			setJobs((prev) => prev.map((j) => (j.id === job.id ? optimistic : j)));
			try {
				const updated = await api.updateJob(job.id, {
					...job,
					status: newStatus,
					...extraUpdates,
				});
				setJobs((prev) =>
					prev.map((j) => (j.id === updated.id ? toSummaryJob(updated) : j)),
				);
				notify("Job status updated successfully");
			} catch {
				setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
				notify("Failed to move job", "error");
			}
		},
		[],
	);

	const handleStatusChange = useCallback(
		(job: Job, newStatus: JobStatus) => {
			if (TERMINAL_STATUSES.has(newStatus)) {
				setPendingTerminalChange({ job, newStatus });
				return;
			}
			void applyStatusChange(job, newStatus, { ending_substatus: null });
		},
		[applyStatusChange],
	);

	const handleTerminalConfirm = useCallback(
		(substatus: EndingSubstatus, notes: string | null) => {
			if (!pendingTerminalChange) {
				return;
			}
			const { job, newStatus } = pendingTerminalChange;
			setPendingTerminalChange(null);
			void applyStatusChange(job, newStatus, {
				ending_substatus: substatus,
				notes,
			});
		},
		[pendingTerminalChange, applyStatusChange],
	);

	const handleToggleFavorite = useCallback(async (job: Job) => {
		const updated = { ...job, favorite: !job.favorite };
		setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
		try {
			await api.updateJob(job.id, updated);
		} catch {
			setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
			notify("Failed to update favorite", "error");
		}
	}, []);

	// Count of active filters shown in the Filters popover badge
	const activeFilterCount =
		(minFitScore !== null ? 1 : 0) +
		(hideWithdrawn ? 1 : 0) +
		(filterTags.length > 0 ? 1 : 0);

	// Defer filter values so the input stays responsive while the board catches up
	const deferredSearch = useDeferredValue(search);
	const deferredFavoritesOnly = useDeferredValue(favoritesOnly);
	const deferredMinFitScore = useDeferredValue(minFitScore);
	const deferredHideWithdrawn = useDeferredValue(hideWithdrawn);
	const deferredFilterTags = useDeferredValue(filterTags);

	const filteredJobs = useMemo(
		() =>
			jobs.filter((j) => {
				const q = deferredSearch.trim().toLowerCase();
				if (
					q &&
					!j.company.toLowerCase().includes(q) &&
					!j.role.toLowerCase().includes(q)
				) {
					return false;
				}
				if (deferredFavoritesOnly && !j.favorite) {
					return false;
				}
				if (deferredMinFitScore !== null) {
					const minIdx = FIT_SCORES.indexOf(deferredMinFitScore);
					const jobIdx = j.fit_score ? FIT_SCORES.indexOf(j.fit_score) : -1;
					if (jobIdx < minIdx) {
						return false;
					}
				}
				if (
					deferredHideWithdrawn &&
					(j.ending_substatus === "Withdrawn" ||
						j.ending_substatus === "Not a good fit" ||
						j.ending_substatus === "Job closed")
				) {
					return false;
				}
				if (
					deferredFilterTags.length > 0 &&
					!deferredFilterTags.some((t) => j.tags.includes(t))
				) {
					return false;
				}
				return true;
			}),
		[
			jobs,
			deferredSearch,
			deferredFavoritesOnly,
			deferredMinFitScore,
			deferredHideWithdrawn,
			deferredFilterTags,
		],
	);

	return (
		<>
			{/* Board toolbar: Add Job button + filters */}
			<Box
				sx={{
					alignItems: "center",
					bgcolor: "primary.main",
					borderTop: "1px solid rgba(99,102,241,0.15)",
					display: "flex",
					gap: 1.5,
					position: "sticky",
					px: 2,
					py: 0.5,
					top: 0,
					zIndex: (theme) => theme.zIndex.appBar - 1,
				}}
			>
				<Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
					Add Job
				</Button>

				<TextField
					placeholder="Search company or role… ( / )"
					size="small"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					slotProps={{
						input: {
							inputRef: searchRef,
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon
										fontSize="small"
										sx={{ color: "text.disabled" }}
									/>
								</InputAdornment>
							),
						},
					}}
					sx={{
						"& .MuiOutlinedInput-root": {
							bgcolor: "rgba(255,255,255,0.7)",
							borderRadius: 2,
						},
						flex: 1,
						maxWidth: 360,
					}}
				/>

				<Box sx={{ alignItems: "center", display: "flex", gap: 1, ml: "auto" }}>
					<Tooltip
						title={favoritesOnly ? "Showing favorites only" : "Favorites only"}
					>
						<IconButton
							aria-label="Favorites only"
							size="small"
							onClick={() => setFavoritesOnly((v) => !v)}
							sx={{
								"&:hover": {
									bgcolor: favoritesOnly
										? "rgba(255,193,7,0.25)"
										: "rgba(255,255,255,0.2)",
								},
								bgcolor: favoritesOnly
									? "rgba(255,193,7,0.15)"
									: "rgba(255,255,255,0.1)",
								color: favoritesOnly ? "warning.main" : "rgba(255,255,255,0.7)",
							}}
						>
							{favoritesOnly ? <StarIcon /> : <StarBorderIcon />}
						</IconButton>
					</Tooltip>

					<Badge badgeContent={activeFilterCount || null} color="error">
						<Button
							size="small"
							startIcon={<TuneIcon />}
							onClick={(e) => setFilterAnchor(e.currentTarget)}
							variant="outlined"
							sx={{
								"&:hover": {
									bgcolor:
										activeFilterCount > 0
											? "rgba(255,255,255,0.3)"
											: "rgba(255,255,255,0.85)",
									borderColor:
										activeFilterCount > 0
											? "rgba(255,255,255,0.7)"
											: "rgba(0,0,0,0.87)",
								},
								bgcolor:
									activeFilterCount > 0
										? "rgba(255,255,255,0.2)"
										: "rgba(255,255,255,0.7)",
								borderColor:
									activeFilterCount > 0
										? "rgba(255,255,255,0.5)"
										: "rgba(0,0,0,0.23)",
								borderRadius: "16px",
								color: activeFilterCount > 0 ? "white" : "text.primary",
								fontSize: "0.8125rem",
								fontWeight: 500,
							}}
						>
							Filters
						</Button>
					</Badge>
				</Box>
			</Box>

			{/* Filters popover */}
			<Popover
				open={Boolean(filterAnchor)}
				anchorEl={filterAnchor}
				onClose={() => setFilterAnchor(null)}
				anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
				transformOrigin={{ horizontal: "right", vertical: "top" }}
				slotProps={{ paper: { sx: { mt: 0.5, p: 2, width: 260 } } }}
			>
				<Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
					Filters
				</Typography>
				<Stack spacing={2}>
					<Box>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", mb: 0.5 }}
						>
							Minimum fit score
						</Typography>
						<Select
							size="small"
							fullWidth
							value={minFitScore ?? ""}
							onChange={(e) =>
								setMinFitScore((e.target.value as FitScore) || null)
							}
							displayEmpty
							renderValue={(val) =>
								val
									? (MIN_FIT_SCORE_OPTIONS.find((o) => o.value === val)
											?.label ?? "Any score")
									: "Any score"
							}
						>
							{MIN_FIT_SCORE_OPTIONS.map(({ label, value }) => (
								<MenuItem key={label} value={value ?? ""}>
									{label}
								</MenuItem>
							))}
						</Select>
					</Box>

					<FormControlLabel
						control={
							<Switch
								checked={hideWithdrawn}
								onChange={(e) => setHideWithdrawn(e.target.checked)}
								size="small"
							/>
						}
						label="Hide withdrawn/bad fits"
						sx={{
							"& .MuiFormControlLabel-label": { fontSize: "0.875rem" },
							mx: 0,
						}}
					/>

					<Box>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", mb: 0.75 }}
						>
							Tags
						</Typography>
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
							{JOB_TAGS.map((tag) => {
								const active = filterTags.includes(tag);
								return (
									<Chip
										key={tag}
										label={TAG_LABELS[tag]}
										size="small"
										{...(active
											? tagChipProps(tag, true)
											: { color: "default" as const })}
										variant={active ? "filled" : "outlined"}
										onClick={() =>
											setFilterTags((prev) =>
												active ? prev.filter((t) => t !== tag) : [...prev, tag],
											)
										}
									/>
								);
							})}
						</Box>
					</Box>

					{activeFilterCount > 0 && (
						<>
							<Divider />
							<Button
								size="small"
								onClick={() => {
									setMinFitScore(null);
									setHideWithdrawn(false);
									setFilterTags([]);
								}}
								sx={{ alignSelf: "flex-start", px: 0 }}
							>
								Clear filters
							</Button>
						</>
					)}
				</Stack>
			</Popover>

			{/* Board content */}
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
					<CircularProgress />
				</Box>
			) : (
				<Box sx={{ pt: 3 }}>
					<KanbanBoard
						jobs={filteredJobs}
						onStatusChange={handleStatusChange}
						onCardClick={openEdit}
						onToggleFavorite={handleToggleFavorite}
					/>
				</Box>
			)}

			<JobDialog
				open={dialogOpen}
				onClose={closeDialog}
				onSave={handleSave}
				onDelete={handleDelete}
				jobId={dialogJob?.id ?? null}
			/>

			<EndingStatusDialog
				open={pendingTerminalChange !== null}
				job={pendingTerminalChange?.job ?? null}
				newStatus={pendingTerminalChange?.newStatus ?? null}
				onConfirm={handleTerminalConfirm}
				onCancel={() => setPendingTerminalChange(null)}
			/>

			<Snackbar
				open={snack.open}
				autoHideDuration={3000}
				onClose={() => setSnack((s) => ({ ...s, open: false }))}
				anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
			>
				<Alert
					severity={snack.severity}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snack.message.includes("\n")
						? snack.message
								.split("\n")
								// eslint-disable-next-line react/no-array-index-key
								.map((line, i) => <div key={i}>{line}</div>)
						: snack.message}
				</Alert>
			</Snackbar>
		</>
	);
}
