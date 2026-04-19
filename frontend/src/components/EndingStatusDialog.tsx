import React, { useEffect, useState } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import { ENDING_SUBSTATUSES } from "../constants";
import type { EndingSubstatus, Job, JobStatus } from "../types";

interface Props {
	open: boolean;
	job: Job | null;
	newStatus: JobStatus | null;
	onConfirm: (substatus: EndingSubstatus, notes: string | null) => void;
	onCancel: () => void;
}

export default function EndingStatusDialog({
	open,
	job,
	newStatus,
	onConfirm,
	onCancel,
}: Props) {
	const [substatus, setSubstatus] = useState<EndingSubstatus | "">("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState("");

	const isOffer = newStatus === "Offer!";

	useEffect(() => {
		if (open) {
			setSubstatus(isOffer ? "Offer accepted" : "");
			setNotes(job?.notes ?? "");
			setError("");
		}
	}, [open, job, isOffer]);

	function handleConfirm() {
		if (!substatus) {
			setError("Required");
			return;
		}
		onConfirm(substatus, notes || null);
	}

	return (
		<Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
			<DialogTitle>Update Final Status</DialogTitle>
			<DialogContent>
				<Typography variant="body2" sx={{ mb: 2 }}>
					Moving{" "}
					<strong>
						{job?.company} – {job?.role}
					</strong>{" "}
					to <strong>{newStatus}</strong>
				</Typography>
				<TextField
					select
					label="Final Resolution *"
					value={substatus}
					onChange={(e) => {
						setSubstatus(e.target.value as EndingSubstatus);
						if (error) {
							setError("");
						}
					}}
					disabled={isOffer}
					error={Boolean(error)}
					helperText={error}
					fullWidth
					size="small"
					sx={{ mb: 2 }}
				>
					{ENDING_SUBSTATUSES.map((s) => (
						<MenuItem key={s} value={s}>
							{s}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					fullWidth
					size="small"
					multiline
					rows={3}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				<Button variant="contained" onClick={handleConfirm}>
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
}
