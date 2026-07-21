import React, { useEffect, useState } from "react";
import {
	Alert,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	List,
	ListItem,
	ListItemText,
	TextField,
	Typography,
} from "@mui/material";
import { STATUS_LABELS } from "../../constants";
import type { BlockingJob, JobStatus } from "../../types";

interface Props {
	open: boolean;
	/** Non-null once a start attempt was blocked by unresolved jobs in the active round. */
	blockingJobs: BlockingJob[] | null;
	onConfirm: (name: string, notes: string | null) => void;
	onCancel: () => void;
}

export default function NewSearchRoundDialog({
	open,
	blockingJobs,
	onConfirm,
	onCancel,
}: Props) {
	const [name, setName] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (open) {
			setName("");
			setNotes("");
			setError("");
		}
	}, [open]);

	function handleConfirm() {
		if (!name.trim()) {
			setError("Required");
			return;
		}
		onConfirm(name.trim(), notes || null);
	}

	const blocked = blockingJobs !== null && blockingJobs.length > 0;

	return (
		<Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
			<DialogTitle>Start a New Job Search</DialogTitle>
			<DialogContent>
				{blocked ? (
					<>
						<Alert severity="warning" sx={{ mb: 2 }}>
							Resolve these jobs before starting a new job search:
						</Alert>
						<List dense disablePadding>
							{blockingJobs.map((job) => (
								<ListItem key={job.id} disableGutters>
									<ListItemText
										primary={`${job.company} – ${job.role}`}
										secondary={
											STATUS_LABELS[job.status as JobStatus] ?? job.status
										}
									/>
								</ListItem>
							))}
						</List>
					</>
				) : (
					<>
						<Typography variant="body2" sx={{ mb: 2 }}>
							Closes your current job search and starts a fresh board.
						</Typography>
						<TextField
							label="Job Search Name *"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (error) {
									setError("");
								}
							}}
							error={Boolean(error)}
							helperText={error}
							fullWidth
							size="small"
							sx={{ mb: 2 }}
						/>
						<TextField
							label="Notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							fullWidth
							size="small"
							multiline
							rows={3}
						/>
					</>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				{!blocked && (
					<Button variant="contained" onClick={handleConfirm}>
						Continue
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
