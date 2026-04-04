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
import { STATUS_COLORS, STATUSES } from "../../constants";
import type { JobStatus } from "../../types";

interface Props {
	byStatus: { status: string; count: number }[];
}

function toChartData(byStatus: { status: string; count: number }[]) {
	const map = Object.fromEntries(byStatus.map((s) => [s.status, s.count]));
	return STATUSES.map((s) => ({
		name: s,
		count: map[s] ?? 0,
		color: STATUS_COLORS[s as JobStatus],
	}));
}

export default function PipelineFunnelChart({ byStatus }: Props) {
	const data = toChartData(byStatus);
	const total = data.reduce((sum, d) => sum + d.count, 0);

	if (total === 0) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 260,
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
			<BarChart
				data={data}
				layout="vertical"
				margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
			>
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="name"
					width={130}
					tick={{ fontSize: 12 }}
				/>
				<Tooltip
					formatter={(value) => [value, "Jobs"]}
					cursor={{ fill: "rgba(0,0,0,0.04)" }}
				/>
				<Bar dataKey="count" radius={[0, 4, 4, 0]}>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.color} />
					))}
					<LabelList
						dataKey="count"
						position="right"
						style={{ fontSize: 12 }}
					/>
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	);
}
