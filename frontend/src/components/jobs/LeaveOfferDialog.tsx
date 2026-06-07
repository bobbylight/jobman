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
	company: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function LeaveOfferDialog({
	open,
	company,
	onConfirm,
	onCancel,
}: Props) {
	return (
		<Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
			<DialogTitle sx={{ alignItems: "center", display: "flex", gap: 1 }}>
				<WarningAmberIcon color="warning" />
				Remove offer details?
			</DialogTitle>
			<DialogContent>
				<Typography>
					Moving <strong>{company}</strong> out of the Offer column will
					permanently delete the compensation details you recorded.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				<Button color="error" variant="contained" onClick={onConfirm}>
					Remove & Continue
				</Button>
			</DialogActions>
		</Dialog>
	);
}
