import React, {
	useState,
	useEffect,
	useCallback,
	useDeferredValue,
	useMemo,
} from "react";
import {
	ThemeProvider,
	CssBaseline,
	AppBar,
	Toolbar,
	Button,
	Box,
	CircularProgress,
	Snackbar,
	Alert,
	InputAdornment,
	TextField,
	Chip,
	Select,
	MenuItem,
	Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
import theme from "./theme";
import { api } from "./api";
import type { Job, JobFormData, JobStatus, FitScore } from "./types";
import { FIT_SCORES } from "./constants";
import KanbanBoard from "./components/KanbanBoard";
import JobDialog from "./components/JobDialog";

type Severity = "success" | "error" | "info" | "warning";

function formatDatetime(value: string) {
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function nowDatetimeLocal() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function computeDateUpdates(
	job: Pick<Job, "date_phone_screen" | "date_last_onsite">,
	newStatus: JobStatus,
	now: string,
): Pick<Job, "date_phone_screen" | "date_last_onsite"> {
	if (newStatus === "Initial interview") {
		return { date_phone_screen: now, date_last_onsite: null };
	}
	if (newStatus === "Final round interview") {
		return { date_phone_screen: job.date_phone_screen, date_last_onsite: now };
	}
	if (newStatus === "Not started" || newStatus === "Resume submitted") {
		return { date_phone_screen: null, date_last_onsite: null };
	}
	return {
		date_phone_screen: job.date_phone_screen,
		date_last_onsite: job.date_last_onsite,
	};
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

export default function App() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [search, setSearch] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [minFitScore, setMinFitScore] = useState<FitScore | null>(null);
	const [hideWithdrawn, setHideWithdrawn] = useState(false);
	const [loading, setLoading] = useState(true);
	const [dialog, setDialog] = useState<{ open: boolean; job: Job | null }>({
		open: false,
		job: null,
	});
	const [snack, setSnack] = useState<{
		open: boolean;
		message: string;
		severity: Severity;
	}>({
		open: false,
		message: "",
		severity: "success",
	});

	const notify = (message: string, severity: Severity = "success") =>
		setSnack({ open: true, message, severity });

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
		loadJobs();
	}, [loadJobs]);

	const openAdd = useCallback(() => setDialog({ open: true, job: null }), []);
	const openEdit = useCallback(
		(job: Job) => setDialog({ open: true, job }),
		[],
	);
	const closeDialog = useCallback(
		() => setDialog({ open: false, job: null }),
		[],
	);

	const handleSave = useCallback(
		async (formData: JobFormData) => {
			try {
				if (dialog.job) {
					const updated = await api.updateJob(dialog.job.id, formData);
					setJobs((prev) =>
						prev.map((j) => (j.id === updated.id ? updated : j)),
					);
					notify("Job updated");
				} else {
					const created = await api.createJob(formData);
					setJobs((prev) => [created, ...prev]);
					notify("Job added");
				}
				closeDialog();
			} catch {
				notify("Failed to save job", "error");
			}
		},
		[dialog.job, closeDialog],
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

	const handleStatusChange = useCallback(
		async (job: Job, newStatus: JobStatus) => {
			const dateUpdates = computeDateUpdates(
				job,
				newStatus,
				nowDatetimeLocal(),
			);
			const optimistic = { ...job, status: newStatus, ...dateUpdates };
			setJobs((prev) => prev.map((j) => (j.id === job.id ? optimistic : j)));
			try {
				const updated = await api.updateJob(job.id, {
					...job,
					status: newStatus,
					...dateUpdates,
				});
				setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
				const lines = ["Job status updated successfully"];
				if (dateUpdates.date_phone_screen !== job.date_phone_screen) {
					lines.push(
						dateUpdates.date_phone_screen
							? `Phone screen date set to ${formatDatetime(dateUpdates.date_phone_screen)}`
							: "Phone screen date cleared",
					);
				}
				if (dateUpdates.date_last_onsite !== job.date_last_onsite) {
					lines.push(
						dateUpdates.date_last_onsite
							? `Last onsite date set to ${formatDatetime(dateUpdates.date_last_onsite)}`
							: "Last onsite date cleared",
					);
				}
				notify(lines.join("\n"));
			} catch {
				setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
				notify("Failed to move job", "error");
			}
		},
		[],
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

	const hasActiveFilters =
		favoritesOnly || minFitScore !== null || hideWithdrawn;
	const hasAnyFilter = search.trim() !== "" || hasActiveFilters;

	function clearFilters() {
		setSearch("");
		setFavoritesOnly(false);
		setMinFitScore(null);
		setHideWithdrawn(false);
	}

	// Defer filter values so the input stays responsive while the board catches up
	const deferredSearch = useDeferredValue(search);
	const deferredFavoritesOnly = useDeferredValue(favoritesOnly);
	const deferredMinFitScore = useDeferredValue(minFitScore);
	const deferredHideWithdrawn = useDeferredValue(hideWithdrawn);

	const filteredJobs = useMemo(
		() =>
			jobs.filter((j) => {
				const q = deferredSearch.trim().toLowerCase();
				if (
					q &&
					!j.company.toLowerCase().includes(q) &&
					!j.role.toLowerCase().includes(q)
				)
					return false;
				if (deferredFavoritesOnly && !j.favorite) return false;
				if (deferredMinFitScore !== null) {
					const minIdx = FIT_SCORES.indexOf(deferredMinFitScore);
					const jobIdx = j.fit_score ? FIT_SCORES.indexOf(j.fit_score) : -1;
					if (jobIdx < minIdx) return false;
				}
				if (deferredHideWithdrawn && j.ending_substatus === "Withdrawn")
					return false;
				return true;
			}),
		[
			jobs,
			deferredSearch,
			deferredFavoritesOnly,
			deferredMinFitScore,
			deferredHideWithdrawn,
		],
	);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />

			<AppBar position="sticky">
				<Toolbar sx={{ gap: 1, minHeight: "56px !important" }}>
					<Box
						component="img"
						src="/img/logo.svg"
						alt="JobMan"
						sx={{ height: 52 }}
					/>
					<Box sx={{ flexGrow: 1 }} />
					<Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
						Add Job
					</Button>
				</Toolbar>

				{/* Filter strip */}
				<Box
					sx={{
						px: 2,
						py: 0.5,
						display: "flex",
						gap: 1,
						alignItems: "center",
						flexWrap: "wrap",
						borderTop: "1px solid rgba(99,102,241,0.15)",
					}}
				>
					<TextField
						placeholder="Search company or role…"
						size="small"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						slotProps={{
							input: {
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
							width: 280,
							"& .MuiOutlinedInput-root": {
								bgcolor: "rgba(255,255,255,0.7)",
								borderRadius: 2,
							},
						}}
					/>

					<Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

					<Chip
						icon={<StarIcon fontSize="small" />}
						label="Favorites"
						onClick={() => setFavoritesOnly((v) => !v)}
						color={favoritesOnly ? "warning" : "default"}
						variant={favoritesOnly ? "filled" : "outlined"}
						sx={{
							fontWeight: 500,
							bgcolor: favoritesOnly ? undefined : "rgba(255,255,255,0.7)",
						}}
					/>

					<Select
						size="small"
						value={minFitScore ?? ""}
						onChange={(e) =>
							setMinFitScore((e.target.value as FitScore) || null)
						}
						displayEmpty
						renderValue={(val) =>
							val
								? (MIN_FIT_SCORE_OPTIONS.find((o) => o.value === val)?.label ??
									"Fit score")
								: "Fit score"
						}
						sx={{
							height: 32,
							bgcolor: minFitScore ? "primary.main" : "rgba(255,255,255,0.7)",
							color: minFitScore ? "primary.contrastText" : "text.primary",
							borderRadius: "16px",
							fontWeight: 500,
							fontSize: "0.8125rem",
							"& .MuiSelect-icon": {
								color: minFitScore ? "primary.contrastText" : "action.active",
							},
							"& .MuiOutlinedInput-notchedOutline": {
								borderColor: minFitScore ? "primary.main" : "rgba(0,0,0,0.23)",
							},
							"&:hover .MuiOutlinedInput-notchedOutline": {
								borderColor: minFitScore ? "primary.dark" : "rgba(0,0,0,0.87)",
							},
							minWidth: 120,
						}}
					>
						{MIN_FIT_SCORE_OPTIONS.map(({ label, value }) => (
							<MenuItem key={label} value={value ?? ""}>
								{label}
							</MenuItem>
						))}
					</Select>

					<Chip
						label="Hide Withdrawn"
						onClick={() => setHideWithdrawn((v) => !v)}
						color={hideWithdrawn ? "primary" : "default"}
						variant={hideWithdrawn ? "filled" : "outlined"}
						sx={{
							fontWeight: 500,
							bgcolor: hideWithdrawn ? undefined : "rgba(255,255,255,0.7)",
						}}
					/>

					{hasAnyFilter && (
						<>
							<Divider
								orientation="vertical"
								flexItem
								sx={{ mx: 0.5, my: 0.5 }}
							/>
							<Chip
								icon={<CloseIcon fontSize="small" />}
								label="Clear"
								onClick={clearFilters}
								size="small"
								sx={{ fontWeight: 500, bgcolor: "rgba(255,255,255,0.7)" }}
							/>
						</>
					)}
				</Box>
			</AppBar>

			<Box
				sx={{
					bgcolor: "background.default",
					minHeight: "calc(100vh - 64px)",
					pt: 3,
				}}
			>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
						<CircularProgress />
					</Box>
				) : (
					<KanbanBoard
						jobs={filteredJobs}
						onStatusChange={handleStatusChange}
						onCardClick={openEdit}
						onToggleFavorite={handleToggleFavorite}
					/>
				)}
			</Box>

			<JobDialog
				open={dialog.open}
				onClose={closeDialog}
				onSave={handleSave}
				onDelete={handleDelete}
				initialValues={dialog.job}
			/>

			<Snackbar
				open={snack.open}
				autoHideDuration={3000}
				onClose={() => setSnack((s) => ({ ...s, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					severity={snack.severity}
					variant="filled"
					sx={{ width: "100%" }}
				>
					{snack.message.includes("\n")
						? snack.message
								.split("\n")
								.map((line, i) => <div key={i}>{line}</div>)
						: snack.message}
				</Alert>
			</Snackbar>
		</ThemeProvider>
	);
}
