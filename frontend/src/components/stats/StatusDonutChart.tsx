import React from "react";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { STATUSES, STATUS_COLORS } from "../../constants";
import type { JobStatus } from "../../types";

interface Props {
	byStatus: { status: string; count: number }[];
}

// Render statuses in canonical pipeline order, omitting zeros
function toChartData(byStatus: { status: string; count: number }[]) {
	const map = Object.fromEntries(byStatus.map((s) => [s.status, s.count]));
	return STATUSES.filter((s) => (map[s] ?? 0) > 0).map((s) => ({
		color: STATUS_COLORS[s as JobStatus],
		name: s,
		value: map[s],
	}));
}

export default function StatusDonutChart({ byStatus }: Props) {
	const data = toChartData(byStatus);

	if (data.length === 0) {
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
					No data for this period
				</Typography>
			</Box>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={260}>
			<PieChart>
				<Pie
					data={data}
					cx="50%"
					cy="50%"
					innerRadius={70}
					outerRadius={100}
					paddingAngle={2}
					dataKey="value"
				>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.color} />
					))}
				</Pie>
				<Tooltip />
				<Legend
					iconType="circle"
					iconSize={10}
					formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
