import React, { useEffect, useState } from "react";
import {
	Box,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Button,
	IconButton,
	List,
	ListItemButton,
	ListItemText,
	Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import { api } from "../../api";
import { useNotify } from "../../useSnackbar";
import type { JobSearch } from "../../types";

function formatStartedDate(startedAt: string): string {
	const d = new Date(startedAt);
	if (isNaN(d.getTime())) {
		return startedAt;
	}
	return d.toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

interface Props {
	open: boolean;
	onClose: () => void;
	onSelect: (search: JobSearch) => void;
}

export default function PastSearchesDialog({ open, onClose, onSelect }: Props) {
	const [searches, setSearches] = useState<JobSearch[] | null>(null);
	const notify = useNotify();

	useEffect(() => {
		if (!open) {
			setSearches(null);
			return;
		}
		let cancelled = false;
		api
			.listSearches()
			.then((all) => {
				if (!cancelled) {
					setSearches(all.filter((s) => s.closed_at !== null));
				}
			})
			.catch(() => {
				if (!cancelled) {
					notify("Failed to load past job searches", "error");
					setSearches([]);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, notify]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle
				sx={{
					alignItems: "center",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				Past Job Searches
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers sx={{ p: searches?.length ? 0 : 2 }}>
				{searches === null && (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress size={28} />
					</Box>
				)}
				{searches !== null && searches.length === 0 && (
					<Typography
						variant="body2"
						color="text.disabled"
						sx={{ py: 2, textAlign: "center" }}
					>
						No past job searches yet — closed rounds will show up here.
					</Typography>
				)}
				{searches !== null && searches.length > 0 && (
					<List dense disablePadding>
						{searches.map((search) => (
							<ListItemButton key={search.id} onClick={() => onSelect(search)}>
								<HistoryIcon
									fontSize="small"
									sx={{ color: "text.disabled", flexShrink: 0, mr: 1.5 }}
								/>
								<ListItemText
									primary={search.name}
									secondary={`Started ${formatStartedDate(search.started_at)}`}
								/>
							</ListItemButton>
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
