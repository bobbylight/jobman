import React from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	Cell,
	ResponsiveContainer,
	LabelList,
} from "recharts";
import { Typography, Box } from "@mui/material";
import { STATUS_COLORS } from "../../constants";
import type { JobStatus } from "../../types";

interface Props {
	avgDaysPerStage: { stage: string; avgDays: number }[];
}

export default function AvgDaysChart({ avgDaysPerStage }: Props) {
	if (avgDaysPerStage.length === 0) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 220,
				}}
			>
				<Typography color="text.secondary" variant="body2">
					No transition data yet — move jobs through stages to see averages
				</Typography>
			</Box>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={220}>
			<BarChart
				data={avgDaysPerStage}
				layout="vertical"
				margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
			>
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="stage"
					width={130}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					formatter={(value) => [`${value} days`, "Avg. time in stage"]}
					cursor={{ fill: "rgba(0,0,0,0.04)" }}
				/>
				<Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
					{avgDaysPerStage.map((entry) => (
						<Cell
							key={entry.stage}
							fill={STATUS_COLORS[entry.stage as JobStatus] ?? "#90a4ae"}
						/>
					))}
					<LabelList
						dataKey="avgDays"
						position="right"
						formatter={(v) => `${v}d`}
						style={{ fontSize: 12 }}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
