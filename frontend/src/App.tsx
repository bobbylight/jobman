import React, { useState, useEffect, useCallback } from "react";
import {
	ThemeProvider,
	CssBaseline,
	AppBar,
	Toolbar,
	Typography,
	Button,
	Box,
	CircularProgress,
	Snackbar,
	Alert,
	InputAdornment,
	TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import WorkIcon from "@mui/icons-material/Work";
import SearchIcon from "@mui/icons-material/Search";
import theme from "./theme";
import { api } from "./api";
import type { Job, JobFormData, JobStatus } from "./types";
import KanbanBoard from "./components/KanbanBoard";
import JobDialog from "./components/JobDialog";

type Severity = "success" | "error" | "info" | "warning";

export default function App() {
	const [jobs, setJobs] = useState<Job[]>([]);
	const [search, setSearch] = useState("");
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

	function openAdd() {
		setDialog({ open: true, job: null });
	}
	function openEdit(job: Job) {
		setDialog({ open: true, job });
	}
	function closeDialog() {
		setDialog({ open: false, job: null });
	}

	async function handleSave(formData: JobFormData) {
		try {
			if (dialog.job) {
				const updated = await api.updateJob(dialog.job.id, formData);
				setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
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
	}

	async function handleDelete(id: number) {
		try {
			await api.deleteJob(id);
			setJobs((prev) => prev.filter((j) => j.id !== id));
			closeDialog();
			notify("Job deleted");
		} catch {
			notify("Failed to delete job", "error");
		}
	}

	async function handleStatusChange(job: Job, newStatus: JobStatus) {
		const optimistic = { ...job, status: newStatus };
		setJobs((prev) => prev.map((j) => (j.id === job.id ? optimistic : j)));
		try {
			const updated = await api.updateJob(job.id, {
				...job,
				status: newStatus,
			});
			setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
		} catch {
			setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
			notify("Failed to move job", "error");
		}
	}

	async function handleToggleFavorite(job: Job) {
		const updated = { ...job, favorite: !job.favorite };
		setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
		try {
			await api.updateJob(job.id, updated);
		} catch {
			setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
			notify("Failed to update favorite", "error");
		}
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />

			<AppBar
				position="sticky"
				elevation={1}
				sx={{ bgcolor: "white", color: "text.primary" }}
			>
				<Toolbar sx={{ gap: 1 }}>
					<WorkIcon color="primary" />
					<Typography
						variant="h6"
						fontWeight={700}
						sx={{ flexGrow: 1, color: "primary.main" }}
					>
						JobMan
					</Typography>
					<Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
						Add Job
					</Button>
				</Toolbar>
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
					<>
						<Box sx={{ px: 3, pb: 2 }}>
							<TextField
								placeholder="Search by company or role…"
								size="small"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								slotProps={{
									input: {
										startAdornment: (
											<InputAdornment position="start">
												<SearchIcon fontSize="small" />
											</InputAdornment>
										),
									},
								}}
								sx={{ width: 320 }}
							/>
						</Box>
						<KanbanBoard
							jobs={jobs.filter((j) => {
								const q = search.trim().toLowerCase();
								if (!q) return true;
								return (
									j.company.toLowerCase().includes(q) ||
									j.role.toLowerCase().includes(q)
								);
							})}
							onStatusChange={handleStatusChange}
							onCardClick={openEdit}
							onToggleFavorite={handleToggleFavorite}
						/>
					</>
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
					{snack.message}
				</Alert>
			</Snackbar>
		</ThemeProvider>
	);
}
