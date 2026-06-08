import React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";
import type { OfferComparisonEntry } from "../../types";
import { annualBonus, equityPerYear, formatCurrency } from "../../offerUtils";

type SegmentKey =
	| "base"
	| "bonus"
	| "equity"
	| "signingBonus"
	| "stipend"
	| "other";

const SEGMENT_LABELS: Record<SegmentKey, string> = {
	base: "Base",
	bonus: "Bonus",
	equity: "Equity/yr",
	other: "Other",
	signingBonus: "Signing Bonus",
	stipend: "Stipend",
};

const SEGMENT_COLORS: Record<SegmentKey, string> = {
	base: "#1e88e5",
	bonus: "#26a69a",
	equity: "#7e57c2",
	other: "#bdbdbd",
	signingBonus: "#ffa726",
	stipend: "#66bb6a",
};

const SEGMENT_KEYS: SegmentKey[] = [
	"base",
	"bonus",
	"equity",
	"signingBonus",
	"stipend",
	"other",
];

type DataPoint = { company: string } & Record<SegmentKey, number>;

function toDataPoint({ job, offer }: OfferComparisonEntry): DataPoint | null {
	if (offer === null) {
		return null;
	}
	return {
		base: offer.base_pay_amount ?? 0,
		bonus: annualBonus(offer),
		company: job.company,
		equity: equityPerYear(offer),
		other: offer.other_amount ?? 0,
		signingBonus: offer.signing_bonus_amount ?? 0,
		stipend: offer.wellness_stipend_amount ?? 0,
	};
}

interface Props {
	entries: OfferComparisonEntry[];
}

export default function OfferBreakdownChart({ entries }: Props) {
	const data = entries
		.map(toDataPoint)
		.filter((d): d is DataPoint => d !== null);

	if (data.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 200,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No offer data yet — record offer details to see a pay breakdown
				</Typography>
			</Box>
		);
	}

	const height = Math.max(200, data.length * 70 + 60);

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart
				data={data}
				layout="vertical"
				margin={{ bottom: 4, left: 8, right: 24, top: 4 }}
			>
				<CartesianGrid strokeDasharray="3 3" horizontal={false} />
				<XAxis
					type="number"
					tickFormatter={(v) => formatCurrency(Number(v))}
					tick={{ fontSize: 11 }}
				/>
				<YAxis
					type="category"
					dataKey="company"
					width={120}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					formatter={(value, name) => [formatCurrency(Number(value)), name]}
					contentStyle={{ fontSize: 12 }}
				/>
				<Legend wrapperStyle={{ fontSize: 11 }} />
				{SEGMENT_KEYS.map((key) => (
					<Bar
						key={key}
						dataKey={key}
						name={SEGMENT_LABELS[key]}
						stackId="tc"
						fill={SEGMENT_COLORS[key]}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	);
}
