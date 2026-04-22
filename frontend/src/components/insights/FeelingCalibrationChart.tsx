import React from "react";
import {
	Bar,
	BarChart,
	Cell,
	LabelList,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box, Typography } from "@mui/material";

const FEELING_LABELS: Record<string, string> = {
	aced: "Aced it",
	flunked: "Flunked",
	meh: "Meh",
	pretty_good: "Pretty good",
	struggled: "Struggled",
};

const FEELING_RANK: Record<string, number> = {
	aced: 5,
	flunked: 1,
	meh: 3,
	pretty_good: 4,
	struggled: 2,
};

// Gradient from green (high confidence) to red (low confidence)
const FEELING_COLORS: Record<string, string> = {
	aced: "#66bb6a",
	flunked: "#ef5350",
	meh: "#ffb300",
	pretty_good: "#29b6f6",
	struggled: "#ff7043",
};

interface FeelingRow {
	feeling: string;
	passed: number;
	failed: number;
	noResult: number;
}

interface Props {
	feelingVsResult: FeelingRow[];
}

function computeCalibrationLabel(data: FeelingRow[]): string | null {
	const withResults = data.filter((d) => d.passed + d.failed > 0);
	const totalWithResults = withResults.reduce(
		(s, d) => s + d.passed + d.failed,
		0,
	);
	if (totalWithResults < 5) {
		return null;
	}

	const points = withResults
		.filter((d) => d.feeling in FEELING_RANK)
		.map((d) => ({
			feelingRank: FEELING_RANK[d.feeling] as number,
			passRate: d.passed / (d.passed + d.failed),
		}));

	if (points.length < 2) {
		return null;
	}

	const n = points.length;
	const meanX = points.reduce((s, p) => s + p.feelingRank, 0) / n;
	const meanY = points.reduce((s, p) => s + p.passRate, 0) / n;
	const numerator = points.reduce(
		(s, p) => s + (p.feelingRank - meanX) * (p.passRate - meanY),
		0,
	);
	const denomX = Math.sqrt(
		points.reduce((s, p) => s + (p.feelingRank - meanX) ** 2, 0),
	);
	const denomY = Math.sqrt(
		points.reduce((s, p) => s + (p.passRate - meanY) ** 2, 0),
	);

	if (denomX === 0 || denomY === 0) {
		return null;
	}
	const r = numerator / (denomX * denomY);

	if (r >= 0.7) {
		return "You're well-calibrated — trust your gut.";
	}
	if (r >= 0.4) {
		return "Reasonably calibrated.";
	}
	return "Your gut feeling and results don't quite line up.";
}

export default function FeelingCalibrationChart({ feelingVsResult }: Props) {
	if (feelingVsResult.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 220,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					Record how you felt after interviews to see calibration
				</Typography>
			</Box>
		);
	}

	const calibrationLabel = computeCalibrationLabel(feelingVsResult);

	// Build 100% stacked bar data (pass% | fail% | noResult%)
	const data = feelingVsResult.map((d) => {
		const total = d.passed + d.failed + d.noResult;
		const passedPct = Math.round((d.passed / total) * 100);
		const failedPct = Math.round((d.failed / total) * 100);
		const noResultPct = 100 - passedPct - failedPct;
		const n = d.passed + d.failed + d.noResult;
		return {
			feeling: d.feeling,
			failedPct,
			label: `${FEELING_LABELS[d.feeling] ?? d.feeling}`,
			noResultPct,
			passedPct,
			tooltip: `Passed: ${d.passed}  Failed: ${d.failed}  n=${n}`,
		};
	});

	return (
		<Box>
			{calibrationLabel && (
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ mb: 1, display: "block" }}
				>
					{calibrationLabel}
				</Typography>
			)}
			<ResponsiveContainer width="100%" height={data.length * 44 + 16}>
				<BarChart
					data={data}
					layout="vertical"
					margin={{ bottom: 4, left: 8, right: 100, top: 4 }}
					barSize={20}
				>
					<XAxis type="number" domain={[0, 100]} hide />
					<YAxis
						type="category"
						dataKey="label"
						width={90}
						tick={{ fontSize: 12 }}
					/>
					<Tooltip
						formatter={(value, name) => {
							let label = "No result";
							if (name === "passedPct") {
								label = "Passed";
							} else if (name === "failedPct") {
								label = "Failed";
							}
							return [`${value}%`, label];
						}}
						cursor={{ fill: "rgba(0,0,0,0.04)" }}
					/>
					<Bar dataKey="passedPct" stackId="a" fill="#66bb6a" name="passedPct">
						{data.map((entry) => (
							<Cell
								key={entry.feeling}
								fill={FEELING_COLORS[entry.feeling] ?? "#66bb6a"}
							/>
						))}
					</Bar>
					<Bar
						dataKey="failedPct"
						stackId="a"
						fill="#ef5350"
						name="failedPct"
					/>
					<Bar
						dataKey="noResultPct"
						stackId="a"
						fill="#e0e0e0"
						name="noResultPct"
						radius={[0, 4, 4, 0]}
					>
						<LabelList
							dataKey="tooltip"
							position="right"
							style={{ fontSize: 11, fill: "#757575" }}
						/>
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Box>
	);
}
