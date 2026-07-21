import React from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface Props {
	open: boolean;
	currentSearchName: string | null;
	newSearchName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function NewSearchRoundConfirmDialog({
	open,
	currentSearchName,
	newSearchName,
	onConfirm,
	onCancel,
}: Props) {
	return (
		<Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
			<DialogTitle sx={{ alignItems: "center", display: "flex", gap: 1 }}>
				<WarningAmberIcon color="warning" />
				Start new job search?
			</DialogTitle>
			<DialogContent>
				<Typography>
					{currentSearchName ? (
						<>
							This closes <strong>{currentSearchName}</strong> and starts{" "}
							<strong>{newSearchName}</strong> as a fresh board.
						</>
					) : (
						<>
							This starts <strong>{newSearchName}</strong> as a fresh board.
						</>
					)}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				<Button variant="contained" onClick={onConfirm}>
					Start Job Search
				</Button>
			</DialogActions>
		</Dialog>
	);
}
