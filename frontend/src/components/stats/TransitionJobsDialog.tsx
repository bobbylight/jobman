import React, { useEffect, useState } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	List,
	ListItem,
	ListItemText,
	Typography,
} from "@mui/material";
import { api } from "../../api";
import type { LinkJob, StatsWindow } from "../../types";

interface Props {
	from: string;
	onClose: () => void;
	open: boolean;
	to: string;
	window: StatsWindow;
}

export default function TransitionJobsDialog({
	from,
	onClose,
	open,
	to,
	window,
}: Props) {
	const [jobs, setJobs] = useState<LinkJob[] | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		setLoading(true);
		setJobs(null);
		api
			.getLinkJobs(from, to, window)
			.then(setJobs)
			.catch(() => setJobs([]))
			.finally(() => setLoading(false));
	}, [open, from, to, window]);

	return (
		<Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
			<DialogTitle sx={{ pb: 1 }}>
				{from} → {to}
				{jobs !== null && (
					<Typography
						component="span"
						variant="body2"
						color="text.secondary"
						sx={{ ml: 1 }}
					>
						({jobs.length} {jobs.length === 1 ? "job" : "jobs"})
					</Typography>
				)}
			</DialogTitle>

			<DialogContent dividers sx={{ minHeight: 120 }}>
				{loading && (
					<CircularProgress
						size={24}
						sx={{ display: "block", mx: "auto", mt: 3 }}
					/>
				)}

				{!loading && jobs !== null && jobs.length === 0 && (
					<Typography color="text.secondary" variant="body2">
						No jobs found.
					</Typography>
				)}

				{!loading && jobs !== null && jobs.length > 0 && (
					<List disablePadding>
						{jobs.map((job, idx) => (
							<ListItem
								key={job.id}
								disableGutters
								divider={idx < jobs.length - 1}
								secondaryAction={
									job.link ? (
										<IconButton
											component="a"
											href={job.link}
											target="_blank"
											rel="noopener noreferrer"
											size="small"
											aria-label={`Open ${job.company} posting`}
										>
											<OpenInNewIcon fontSize="small" />
										</IconButton>
									) : undefined
								}
							>
								<ListItemText
									primary={job.company}
									secondary={[
										job.role,
										job.date_applied ? `Applied ${job.date_applied}` : null,
									]
										.filter(Boolean)
										.join(" · ")}
								/>
							</ListItem>
						))}
					</List>
				)}
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
