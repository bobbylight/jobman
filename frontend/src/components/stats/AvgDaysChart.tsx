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
					alignItems: "center",
					display: "flex",
					height: 220,
					justifyContent: "center",
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
				margin={{ bottom: 4, left: 8, right: 64, top: 4 }}
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
