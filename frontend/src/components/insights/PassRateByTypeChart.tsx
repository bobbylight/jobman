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

const TYPE_COLORS: Record<string, string> = {
	behavioral: "#66bb6a",
	coding: "#42a5f5",
	culture_fit: "#ec407a",
	leadership: "#ff7043",
	past_experience: "#26c6da",
	system_design: "#ab47bc",
};

const TYPE_LABELS: Record<string, string> = {
	recruiter_call: "Recruiter Call",
	behavioral: "Behavioral",
	coding: "Coding",
	culture_fit: "Culture Fit",
	leadership: "Leadership",
	past_experience: "Past Experience",
	system_design: "System Design",
};

interface Props {
	byType: { type: string; count: number; passed: number; failed: number }[];
}

export default function PassRateByTypeChart({ byType }: Props) {
	const withResults = byType.filter((d) => d.passed + d.failed > 0);

	if (withResults.length === 0) {
		return (
			<Box
				sx={{
					alignItems: "center",
					display: "flex",
					height: 260,
					justifyContent: "center",
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No pass/fail results recorded yet
				</Typography>
			</Box>
		);
	}

	const data = withResults
		.map((d) => {
			const total = d.passed + d.failed;
			return {
				label: `${Math.round((d.passed / total) * 100)}%  n=${d.count}`,
				passRate: Math.round((d.passed / total) * 100),
				type: TYPE_LABELS[d.type] ?? d.type,
				typeKey: d.type,
			};
		})
		.toSorted((a, b) => b.passRate - a.passRate);

	return (
		<ResponsiveContainer width="100%" height={260}>
			<BarChart
				data={data}
				layout="vertical"
				margin={{ bottom: 4, left: 8, right: 80, top: 4 }}
			>
				<XAxis type="number" domain={[0, 100]} hide />
				<YAxis
					type="category"
					dataKey="type"
					width={120}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					formatter={(value) => [`${value}%`, "Pass rate"]}
					cursor={{ fill: "rgba(0,0,0,0.04)" }}
				/>
				<Bar dataKey="passRate" radius={[0, 4, 4, 0]}>
					{data.map((entry) => (
						<Cell
							key={entry.typeKey}
							fill={TYPE_COLORS[entry.typeKey] ?? "#90a4ae"}
						/>
					))}
					<LabelList
						dataKey="label"
						position="right"
						style={{ fontSize: 11 }}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
