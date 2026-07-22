import React, { useState } from "react";
import {
	Box,
	Button,
	FormControlLabel,
	Grid,
	InputAdornment,
	MenuItem,
	Switch,
	TextField,
	Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { api } from "../../api";
import { useNotify } from "../../useSnackbar";
import type { EquityType, Offer, OfferFormData } from "../../types";

const EQUITY_TYPE_LABELS: Record<EquityType, string> = {
	rsus: "RSUs",
	isos: "ISOs",
	nsos: "NSOs",
	profit_sharing: "Profit Sharing",
	phantom: "Phantom",
};

const EQUITY_TYPES: EquityType[] = [
	"rsus",
	"isos",
	"nsos",
	"profit_sharing",
	"phantom",
];

const EMPTY_FORM: OfferFormData = {
	base_pay_amount: null,
	target_bonus_percent: null,
	equity_amount: null,
	equity_vesting_years: 4,
	equity_type: null,
	signing_bonus_amount: null,
	wellness_stipend_amount: null,
	other_amount: null,
	other_label: null,
	other_is_recurring: false,
	k401_match_percent: null,
	offer_deadline: null,
	notes: null,
};

function offerToForm(offer: Offer): OfferFormData {
	return {
		base_pay_amount: offer.base_pay_amount,
		target_bonus_percent: offer.target_bonus_percent,
		equity_amount: offer.equity_amount,
		equity_vesting_years: offer.equity_vesting_years,
		equity_type: offer.equity_type,
		signing_bonus_amount: offer.signing_bonus_amount,
		wellness_stipend_amount: offer.wellness_stipend_amount,
		other_amount: offer.other_amount,
		other_label: offer.other_label,
		other_is_recurring: offer.other_is_recurring,
		k401_match_percent: offer.k401_match_percent,
		offer_deadline: offer.offer_deadline,
		notes: offer.notes,
	};
}

interface Props {
	jobId: number;
	offerData: Offer | null;
	onOfferChange: (offer: Offer | null) => void;
	readOnly?: boolean;
}

export default function OfferTab({
	jobId,
	offerData,
	onOfferChange,
	readOnly = false,
}: Props) {
	const notify = useNotify();
	const [form, setForm] = useState<OfferFormData>(
		offerData ? offerToForm(offerData) : EMPTY_FORM,
	);
	const [saving, setSaving] = useState(false);

	function setField<K extends keyof OfferFormData>(
		field: K,
		value: OfferFormData[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function parseAmount(raw: string): number | null {
		const n = parseInt(raw, 10);
		return Number.isFinite(n) ? n : null;
	}

	function parsePercent(raw: string): number | null {
		const n = parseFloat(raw);
		return Number.isFinite(n) ? n : null;
	}

	async function handleSave() {
		setSaving(true);
		try {
			const saved =
				offerData === null
					? await api.createOffer(jobId, form)
					: await api.updateOffer(jobId, form);
			onOfferChange(saved);
			setForm(offerToForm(saved));
			notify("Offer saved");
		} catch {
			notify("Failed to save offer. Please try again.", "error");
		} finally {
			setSaving(false);
		}
	}

	async function handleClear() {
		setSaving(true);
		try {
			await api.deleteOffer(jobId);
			onOfferChange(null);
			setForm(EMPTY_FORM);
			notify("Offer cleared");
		} catch {
			notify("Failed to clear offer. Please try again.", "error");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Box>
			<Box
				component="fieldset"
				disabled={readOnly}
				sx={{ border: "none", m: 0, p: 0 }}
			>
				<Grid container spacing={2} sx={{ pt: 0.5 }}>
					{/* Row 1: base pay */}
					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="Base Pay ($/yr)"
							type="number"
							value={form.base_pay_amount ?? ""}
							onChange={(e) =>
								setField("base_pay_amount", parseAmount(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0 } }}
						/>
					</Grid>

					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="Target Bonus %"
							type="number"
							value={form.target_bonus_percent ?? ""}
							onChange={(e) =>
								setField("target_bonus_percent", parsePercent(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
						/>
					</Grid>

					{/* Row 2: equity */}
					<Grid size={{ sm: 4, xs: 12 }}>
						<TextField
							label="Equity Amount ($)"
							type="number"
							value={form.equity_amount ?? ""}
							onChange={(e) =>
								setField("equity_amount", parseAmount(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{
								htmlInput: { min: 0 },
								input: {
									endAdornment: (
										<InputAdornment position="end">
											<Tooltip title="Enter total grant value at current fair market value">
												<InfoOutlinedIcon
													aria-label="Enter total grant value at current fair market value"
													fontSize="small"
													sx={{ color: "text.secondary" }}
												/>
											</Tooltip>
										</InputAdornment>
									),
								},
							}}
						/>
					</Grid>

					<Grid size={{ sm: 4, xs: 12 }}>
						<TextField
							label="Equity Vesting (years)"
							type="number"
							value={form.equity_vesting_years}
							onChange={(e) => {
								const n = parseInt(e.target.value, 10);
								setField("equity_vesting_years", Number.isFinite(n) ? n : 4);
							}}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 1, max: 10 } }}
						/>
					</Grid>

					<Grid size={{ sm: 4, xs: 12 }}>
						<TextField
							select
							label="Equity Type"
							value={form.equity_type ?? ""}
							onChange={(e) =>
								setField(
									"equity_type",
									(e.target.value || null) as EquityType | null,
								)
							}
							fullWidth
							size="small"
						>
							<MenuItem value="">
								<em>None</em>
							</MenuItem>
							{EQUITY_TYPES.map((t) => (
								<MenuItem key={t} value={t}>
									{EQUITY_TYPE_LABELS[t]}
								</MenuItem>
							))}
						</TextField>
					</Grid>

					{/* Row 3: stipend / signing bonus */}
					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="Wellness Stipend ($/yr)"
							type="number"
							value={form.wellness_stipend_amount ?? ""}
							onChange={(e) =>
								setField("wellness_stipend_amount", parseAmount(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0 } }}
						/>
					</Grid>

					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="Signing Bonus ($)"
							type="number"
							value={form.signing_bonus_amount ?? ""}
							onChange={(e) =>
								setField("signing_bonus_amount", parseAmount(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0 } }}
						/>
					</Grid>

					{/* Row 4: other */}
					<Grid size={{ sm: 4, xs: 12 }}>
						<TextField
							label="Other Amount ($)"
							type="number"
							value={form.other_amount ?? ""}
							onChange={(e) =>
								setField("other_amount", parseAmount(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0 } }}
						/>
					</Grid>

					<Grid size={{ sm: 4, xs: 12 }}>
						<TextField
							label="Other Label"
							value={form.other_label ?? ""}
							onChange={(e) => setField("other_label", e.target.value || null)}
							fullWidth
							size="small"
							placeholder="e.g. Car allowance"
							slotProps={{ htmlInput: { maxLength: 128 } }}
						/>
					</Grid>

					<Grid size={{ sm: 4, xs: 12 }}>
						<FormControlLabel
							control={
								<Switch
									checked={form.other_is_recurring}
									onChange={(e) =>
										setField("other_is_recurring", e.target.checked)
									}
									size="small"
								/>
							}
							label="Other recurs annually"
						/>
					</Grid>

					{/* Row 5: 401k / deadline */}
					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="401k Match %"
							type="number"
							value={form.k401_match_percent ?? ""}
							onChange={(e) =>
								setField("k401_match_percent", parsePercent(e.target.value))
							}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
						/>
					</Grid>

					<Grid size={{ sm: 6, xs: 12 }}>
						<TextField
							label="Offer Deadline"
							type="date"
							value={form.offer_deadline ?? ""}
							onChange={(e) =>
								setField("offer_deadline", e.target.value || null)
							}
							fullWidth
							size="small"
							slotProps={{ inputLabel: { shrink: true } }}
						/>
					</Grid>

					{/* Row 6: notes */}
					<Grid size={12}>
						<TextField
							label="Notes"
							multiline
							minRows={3}
							value={form.notes ?? ""}
							onChange={(e) => setField("notes", e.target.value || null)}
							fullWidth
							size="small"
							slotProps={{ htmlInput: { maxLength: 20_000 } }}
						/>
					</Grid>
				</Grid>
			</Box>

			{!readOnly && (
				<Box
					sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}
				>
					{offerData !== null && (
						<Button
							color="error"
							disabled={saving}
							onClick={() => void handleClear()}
						>
							Clear
						</Button>
					)}
					<Button
						variant="contained"
						disabled={saving}
						onClick={() => void handleSave()}
					>
						Save Offer
					</Button>
				</Box>
			)}
		</Box>
	);
}
