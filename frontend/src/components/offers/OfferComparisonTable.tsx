import React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableFooter,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import type { EquityType, Offer, OfferComparisonEntry } from "../../types";
import {
	computeOngoingTC,
	computeYear1TC,
	formatCompactCurrency,
	formatCurrency,
} from "../../offerUtils";

const EQUITY_TYPE_LABELS: Record<EquityType, string> = {
	isos: "ISOs",
	nsos: "NSOs",
	phantom: "Phantom",
	profit_sharing: "Profit Sharing",
	rsus: "RSUs",
};

const DASH = "—";

function formatEquity(offer: Offer): string {
	if (offer.equity_amount === null) {
		return DASH;
	}
	const years = offer.equity_vesting_years || 4;
	const perYear = offer.equity_amount / years;
	const type = offer.equity_type
		? ` ${EQUITY_TYPE_LABELS[offer.equity_type]}`
		: "";
	return `${formatCompactCurrency(offer.equity_amount)}${type} over ${years} yrs ≈ ${formatCompactCurrency(perYear)}/yr`;
}

function formatOther(offer: Offer): string {
	if (offer.other_amount === null) {
		return DASH;
	}
	const cadence = offer.other_is_recurring ? "/yr" : " one-time";
	const label = offer.other_label ? ` (${offer.other_label})` : "";
	return `${formatCurrency(offer.other_amount)}${cadence}${label}`;
}

interface Row {
	key: string;
	label: string;
	format: (offer: Offer) => string;
}

const ROWS: Row[] = [
	{
		format: (o) =>
			o.base_pay_amount === null
				? DASH
				: `${formatCurrency(o.base_pay_amount)}/yr`,
		key: "base_pay",
		label: "Base Pay",
	},
	{
		format: (o) =>
			o.target_bonus_percent === null ? DASH : `${o.target_bonus_percent}%`,
		key: "target_bonus",
		label: "Target Bonus",
	},
	{ format: formatEquity, key: "equity", label: "Equity" },
	{
		format: (o) =>
			o.signing_bonus_amount === null
				? DASH
				: formatCurrency(o.signing_bonus_amount),
		key: "signing_bonus",
		label: "Signing Bonus",
	},
	{
		format: (o) =>
			o.wellness_stipend_amount === null
				? DASH
				: `${formatCurrency(o.wellness_stipend_amount)}/yr`,
		key: "wellness_stipend",
		label: "Wellness Stipend",
	},
	{ format: formatOther, key: "other", label: "Other" },
	{
		format: (o) =>
			o.k401_match_percent === null ? DASH : `${o.k401_match_percent}%`,
		key: "k401_match",
		label: "401k Match",
	},
];

interface Props {
	entries: OfferComparisonEntry[];
}

export default function OfferComparisonTable({ entries }: Props) {
	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell />
						{entries.map(({ job }) => (
							<TableCell key={job.id} sx={{ fontWeight: 700 }}>
								{job.company}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					{ROWS.map((row) => (
						<TableRow key={row.key}>
							<TableCell sx={{ color: "text.secondary" }}>
								{row.label}
							</TableCell>
							{entries.map(({ job, offer }) => (
								<TableCell key={job.id}>
									{offer === null ? DASH : row.format(offer)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
				<TableFooter>
					<TableRow>
						<TableCell sx={{ fontWeight: 700 }}>
							<Typography variant="body2" sx={{ fontWeight: 700 }}>
								Total Comp (Year 1)
							</Typography>
						</TableCell>
						{entries.map(({ job, offer }) => (
							<TableCell key={job.id} sx={{ fontWeight: 700 }}>
								{offer === null ? DASH : formatCurrency(computeYear1TC(offer))}
							</TableCell>
						))}
					</TableRow>
					<TableRow>
						<TableCell sx={{ fontWeight: 700 }}>
							<Typography variant="body2" sx={{ fontWeight: 700 }}>
								Total Comp (Ongoing)
							</Typography>
						</TableCell>
						{entries.map(({ job, offer }) => (
							<TableCell key={job.id} sx={{ fontWeight: 700 }}>
								{offer === null
									? DASH
									: formatCurrency(computeOngoingTC(offer))}
							</TableCell>
						))}
					</TableRow>
				</TableFooter>
			</Table>
		</TableContainer>
	);
}
