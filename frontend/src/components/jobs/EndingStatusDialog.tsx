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
import { OFFER_SUBSTATUSES, REJECTED_SUBSTATUSES } from "../constants";
import type { EndingSubstatus, Job, JobStatus } from "../types";

interface Props {
	open: boolean;
	job: Job | null;
	newStatus: JobStatus | null;
	onConfirm: (
		substatus: EndingSubstatus,
		notes: string | null,
		offerDate: string | null,
	) => void;
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
	const [offerDate, setOfferDate] = useState("");
	const [error, setError] = useState("");
	const [offerDateError, setOfferDateError] = useState("");

	const isOffer = newStatus === "Offer!";
	const substatusOptions = isOffer ? OFFER_SUBSTATUSES : REJECTED_SUBSTATUSES;

	useEffect(() => {
		if (open) {
			setSubstatus(isOffer ? "Offer accepted" : "");
			setNotes(job?.notes ?? "");
			setOfferDate(
				job?.date_offer_extended ?? new Date().toISOString().slice(0, 10),
			);
			setError("");
			setOfferDateError("");
		}
	}, [open, job, isOffer]);

	function handleConfirm() {
		let hasError = false;
		if (!substatus) {
			setError("Required");
			hasError = true;
		}
		if (isOffer && !offerDate) {
			setOfferDateError("Required");
			hasError = true;
		}
		if (hasError) {
			return;
		}
		onConfirm(
			substatus as EndingSubstatus,
			notes || null,
			isOffer ? offerDate : null,
		);
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
					error={Boolean(error)}
					helperText={error}
					fullWidth
					size="small"
					sx={{ mb: 2 }}
				>
					{substatusOptions.map((s) => (
						<MenuItem key={s} value={s}>
							{s}
						</MenuItem>
					))}
				</TextField>
				{isOffer && (
					<TextField
						label="Offer Date *"
						type="date"
						value={offerDate}
						onChange={(e) => {
							setOfferDate(e.target.value);
							if (offerDateError) {
								setOfferDateError("");
							}
						}}
						error={Boolean(offerDateError)}
						helperText={offerDateError}
						fullWidth
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
						sx={{ mb: 2 }}
					/>
				)}
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
