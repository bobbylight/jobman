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
	equityPerYear,
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

function maxIndices(values: (number | null)[]): Set<number> {
	const nonNull = values.filter((v): v is number => v !== null);
	if (nonNull.length === 0) {
		return new Set();
	}
	const max = Math.max(...nonNull);
	const indices = new Set<number>();
	for (let i = 0; i < values.length; i++) {
		if (values[i] === max) {
			indices.add(i);
		}
	}
	return indices;
}

interface Row {
	key: string;
	label: string;
	format: (offer: Offer) => string;
	value?: (offer: Offer) => number | null;
}

const ROWS: Row[] = [
	{
		format: (o) =>
			o.base_pay_amount === null
				? DASH
				: `${formatCurrency(o.base_pay_amount)}/yr`,
		key: "base_pay",
		label: "Base Pay",
		value: (o) => o.base_pay_amount,
	},
	{
		format: (o) =>
			o.target_bonus_percent === null ? DASH : `${o.target_bonus_percent}%`,
		key: "target_bonus",
		label: "Target Bonus",
		value: (o) => o.target_bonus_percent,
	},
	{
		format: formatEquity,
		key: "equity",
		label: "Equity",
		value: (o) => (o.equity_amount === null ? null : equityPerYear(o)),
	},
	{
		format: (o) =>
			o.signing_bonus_amount === null
				? DASH
				: formatCurrency(o.signing_bonus_amount),
		key: "signing_bonus",
		label: "Signing Bonus",
		value: (o) => o.signing_bonus_amount,
	},
	{
		format: (o) =>
			o.wellness_stipend_amount === null
				? DASH
				: `${formatCurrency(o.wellness_stipend_amount)}/yr`,
		key: "wellness_stipend",
		label: "Wellness Stipend",
		value: (o) => o.wellness_stipend_amount,
	},
	{
		format: formatOther,
		key: "other",
		label: "Other",
		value: (o) => o.other_amount,
	},
	{
		format: (o) =>
			o.k401_match_percent === null ? DASH : `${o.k401_match_percent}%`,
		key: "k401_match",
		label: "401k Match",
		value: (o) => o.k401_match_percent,
	},
];

interface Props {
	entries: OfferComparisonEntry[];
}

export default function OfferComparisonTable({ entries }: Props) {
	const ongoingTCs = entries.map(({ offer }) =>
		offer === null ? null : computeOngoingTC(offer),
	);
	const year1TCs = entries.map(({ offer }) =>
		offer === null ? null : computeYear1TC(offer),
	);
	const nonNullTCs = ongoingTCs.filter((tc): tc is number => tc !== null);
	const minOngoingTC = nonNullTCs.length > 0 ? Math.min(...nonNullTCs) : null;
	const maxOngoingTC = nonNullTCs.length > 0 ? Math.max(...nonNullTCs) : null;
	const bestColIndices = maxIndices(ongoingTCs);

	const pctOfMinValues = ongoingTCs.map((tc) =>
		tc === null || minOngoingTC === null
			? null
			: Math.round((tc / minOngoingTC) * 100),
	);

	const isBestCol = (i: number) =>
		maxOngoingTC !== null && bestColIndices.has(i);

	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell />
						{entries.map(({ job }, i) => (
							<TableCell
								key={job.id}
								data-best-offer={isBestCol(i) ? "true" : undefined}
								sx={{
									color: isBestCol(i) ? "success.main" : undefined,
									fontWeight: 700,
								}}
							>
								{job.company}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					{ROWS.map((row) => {
						const rowValues = entries.map(({ offer }) =>
							offer === null || !row.value ? null : row.value(offer),
						);
						const boldCols = row.value
							? maxIndices(rowValues)
							: new Set<number>();
						return (
							<TableRow key={row.key}>
								<TableCell sx={{ color: "text.secondary" }}>
									{row.label}
								</TableCell>
								{entries.map(({ job, offer }, i) => (
									<TableCell
										key={job.id}
										data-row-max={boldCols.has(i) ? "true" : undefined}
										data-best-offer={isBestCol(i) ? "true" : undefined}
										sx={{
											color: isBestCol(i) ? "success.main" : undefined,
											fontWeight: boldCols.has(i) ? 700 : undefined,
										}}
									>
										{offer === null ? DASH : row.format(offer)}
									</TableCell>
								))}
							</TableRow>
						);
					})}
				</TableBody>
				<TableFooter>
					{(() => {
						const boldCols = maxIndices(year1TCs);
						return (
							<TableRow>
								<TableCell sx={{ fontWeight: 700 }}>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										Total Comp (Year 1)
									</Typography>
								</TableCell>
								{entries.map(({ job, offer }, i) => (
									<TableCell
										key={job.id}
										data-row-max={boldCols.has(i) ? "true" : undefined}
										data-best-offer={isBestCol(i) ? "true" : undefined}
										sx={{
											color: isBestCol(i) ? "success.main" : undefined,
											fontWeight: 700,
										}}
									>
										{offer === null
											? DASH
											: formatCurrency(computeYear1TC(offer))}
									</TableCell>
								))}
							</TableRow>
						);
					})()}
					{(() => {
						const boldCols = maxIndices(ongoingTCs);
						return (
							<TableRow>
								<TableCell sx={{ fontWeight: 700 }}>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										Total Comp (Ongoing)
									</Typography>
								</TableCell>
								{entries.map(({ job, offer }, i) => (
									<TableCell
										key={job.id}
										data-row-max={boldCols.has(i) ? "true" : undefined}
										data-best-offer={isBestCol(i) ? "true" : undefined}
										sx={{
											color: isBestCol(i) ? "success.main" : undefined,
											fontWeight: 700,
										}}
									>
										{offer === null
											? DASH
											: formatCurrency(computeOngoingTC(offer))}
									</TableCell>
								))}
							</TableRow>
						);
					})()}
					{(() => {
						const boldCols = maxIndices(pctOfMinValues);
						return (
							<TableRow>
								<TableCell sx={{ fontWeight: 700 }}>
									<Typography variant="body2" sx={{ fontWeight: 700 }}>
										% of min offer
									</Typography>
								</TableCell>
								{entries.map(({ job }, i) => {
									const pct = pctOfMinValues[i];
									return (
										<TableCell
											key={job.id}
											data-row-max={boldCols.has(i) ? "true" : undefined}
											data-best-offer={isBestCol(i) ? "true" : undefined}
											sx={{
												color: isBestCol(i) ? "success.main" : undefined,
												fontWeight: 700,
											}}
										>
											{pct === null ? DASH : `${pct}%`}
										</TableCell>
									);
								})}
							</TableRow>
						);
					})()}
				</TableFooter>
			</Table>
		</TableContainer>
	);
}
