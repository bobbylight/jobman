import React, {
	useState,
	useEffect,
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
} from "react";
import {
	AppBar,
	Toolbar,
	Button,
	Box,
	Avatar,
	IconButton,
	Menu,
	MenuItem,
	CircularProgress,
	Snackbar,
	Alert,
	InputAdornment,
	TextField,
	Chip,
	Select,
	Divider,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { api } from "../api";
import type {
	Job,
	JobFormData,
	JobStatus,
	FitScore,
	EndingSubstatus,
	User,
} from "../types";
import { FIT_SCORES, TERMINAL_STATUSES } from "../constants";
import KanbanBoard from "./KanbanBoard";
import JobDialog from "./JobDialog";
import EndingStatusDialog from "./EndingStatusDialog";

type Severity = "success" | "error" | "info" | "warning";

// Minimum fit score filter: show jobs at or above this threshold
// "Not sure" is excluded when any threshold is set
const MIN_FIT_SCORE_OPTIONS: { label: string; value: FitScore | null }[] = [
	{ label: "Any score", value: null },
	{ label: "Low or better", value: "Low" },
	{ label: "Medium or better", value: "Medium" },
	{ label: "High or better", value: "High" },
	{ label: "Very High only", value: "Very High" },
];

interface Props {
	currentUser: User;
	onLogout: () => void;
}

export default function JobManagementPage({ currentUser, onLogout }: Props) {
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
	const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
		null,
	);
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
		void loadJobs();
	}, [loadJobs]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "/") return;
			const tag = (e.target as HTMLElement).tagName;
			if (
				tag === "INPUT" ||
				tag === "TEXTAREA" ||
				(e.target as HTMLElement).isContentEditable
			)
				return;
			e.preventDefault();
			searchRef.current?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

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
				setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
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
			if (!pendingTerminalChange) return;
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
		<>
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
					<IconButton
						onClick={(e) => setUserMenuAnchor(e.currentTarget)}
						size="small"
						sx={{ p: 0 }}
					>
						<Avatar
							src={currentUser.avatarUrl ?? undefined}
							alt={currentUser.displayName ?? currentUser.email}
							sx={{ width: 32, height: 32 }}
						/>
					</IconButton>
					<Menu
						anchorEl={userMenuAnchor}
						open={Boolean(userMenuAnchor)}
						onClose={() => setUserMenuAnchor(null)}
						anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
						transformOrigin={{ vertical: "top", horizontal: "right" }}
						slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160 } } }}
					>
						<MenuItem onClick={() => setUserMenuAnchor(null)}>
							<ListItemIcon>
								<AccountCircleOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>View Profile</ListItemText>
						</MenuItem>
						<MenuItem onClick={() => setUserMenuAnchor(null)}>
							<ListItemIcon>
								<SettingsOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>Settings</ListItemText>
						</MenuItem>
						<Divider />
						<MenuItem
							onClick={() => {
								setUserMenuAnchor(null);
								onLogout();
							}}
						>
							<ListItemIcon>
								<LogoutOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText>Sign Out</ListItemText>
						</MenuItem>
					</Menu>
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
		</>
	);
}
